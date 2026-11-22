import type { PlaceDto } from "../domain/route";
import { haversineKm } from "../lib/geo";
import { TtlCache } from "../lib/ttl-cache";
import { logEvent } from "../lib/logger";
import { AppError } from "../lib/errors";
import type { Result } from "../lib/result";
import {
  LandmarkGeocodeRepository,
  NominatimGeocodeRepository,
  type GeocodeRepository,
} from "../repositories/geocode.repository";
let nextUpstreamAt = 0;
async function reserveSearchSlot(): Promise<boolean> {
  const now = Date.now();
  const waitMs = Math.max(0, nextUpstreamAt - now);
  if (waitMs > 1500) return false;
  nextUpstreamAt = now + waitMs + 1000;
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  return true;
}
export class GeocodeService {
  private readonly cache = new TtlCache<PlaceDto[]>(500, 24 * 60 * 60 * 1000);
  constructor(
    private readonly remote: GeocodeRepository = new NominatimGeocodeRepository(),
    private readonly local: GeocodeRepository = new LandmarkGeocodeRepository(),
  ) {}
  async search(
    query: string,
    requestId = crypto.randomUUID(),
    mode: "local" | "search" = "local",
  ): Promise<Result<PlaceDto[], AppError>> {
    const key = query.toLocaleLowerCase();
    const cached = mode === "search" ? this.cache.get(key) : undefined;
    if (cached) return { ok: true, value: structuredClone(cached) };
    const local = await this.local.search(query);
    const places = local.ok ? local.value : [];
    if (mode === "local") return { ok: true, value: places };
    if (!(await reserveSearchSlot()))
      return {
        ok: false,
        error: new AppError(
          "UPSTREAM_UNAVAILABLE",
          "Place search busy. Please retry.",
        ),
      };
    return { ok: true, value: await this.enrich(query, places, requestId) };
  }
  private async enrich(
    query: string,
    local: PlaceDto[],
    requestId: string,
  ): Promise<PlaceDto[]> {
    const key = query.toLocaleLowerCase();
    const places = [...local];
    const remote = await this.remote.search(query);
    if (!remote.ok) {
      logEvent("warn", "geocode.upstream_unavailable", requestId);
      return places;
    }
    for (const place of remote.value) {
      if (!places.some((existing) => haversineKm(existing, place) < 0.1))
        places.push(place);
    }
    this.cache.set(key, places.slice(0, 10));
    return structuredClone(places.slice(0, 10));
  }
}
const service = new GeocodeService();
export function searchPlaces(
  query: string,
  requestId?: string,
  mode: "local" | "search" = "local",
): Promise<Result<PlaceDto[], AppError>> {
  return service.search(query, requestId, mode);
}
