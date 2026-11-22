import type { PlaceDto } from "../domain/route";
import { haversineKm } from "../lib/geo";
import { TtlCache } from "../lib/ttl-cache";
import { logEvent } from "../lib/logger";
import {
  LandmarkGeocodeRepository,
  NominatimGeocodeRepository,
  type GeocodeRepository,
} from "../repositories/geocode.repository";
let nextUpstreamAt = 0;
export class GeocodeService {
  private readonly cache = new TtlCache<PlaceDto[]>(500, 24 * 60 * 60 * 1000);
  constructor(
    private readonly remote: GeocodeRepository = new NominatimGeocodeRepository(),
    private readonly local: GeocodeRepository = new LandmarkGeocodeRepository(),
  ) {}
  async search(
    query: string,
    requestId = crypto.randomUUID(),
  ): Promise<PlaceDto[]> {
    const key = query.toLocaleLowerCase();
    const cached = this.cache.get(key);
    if (cached) return structuredClone(cached);
    const local = await this.local.search(query);
    const places = local.ok ? local.value : [];
    if (Date.now() < nextUpstreamAt) return places;
    nextUpstreamAt = Date.now() + 1000;
    const enriched = this.enrich(query, places, requestId);
    if (!places.length) return enriched;
    this.cache.set(key, places);
    void enriched.catch(() =>
      logEvent("warn", "geocode.upstream_unavailable", requestId),
    );
    return structuredClone(places);
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
): Promise<PlaceDto[]> {
  return service.search(query, requestId);
}
