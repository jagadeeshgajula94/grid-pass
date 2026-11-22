import type { PlaceDto } from "../domain/route";
import { LANDMARK_SEED } from "../db/landmark-seed";
import { AppError } from "../lib/errors";
import type { Result } from "../lib/result";
import { upstreamFetch } from "../lib/upstream-fetch";
import { nominatimPayloadSchema } from "../validation/geocode.schema";
export interface GeocodeRepository {
  search(query: string): Promise<Result<PlaceDto[], AppError>>;
}
export class LandmarkGeocodeRepository implements GeocodeRepository {
  async search(query: string): Promise<Result<PlaceDto[], AppError>> {
    return {
      ok: true,
      value: LANDMARK_SEED.filter((place) =>
        place.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      )
        .slice(0, 6)
        .map((place) => ({ ...place })),
    };
  }
}
export class NominatimGeocodeRepository implements GeocodeRepository {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async search(query: string): Promise<Result<PlaceDto[], AppError>> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({
      q: query,
      format: "jsonv2",
      countrycodes: "in",
      limit: "6",
    }).toString();
    const result = await upstreamFetch(url, 3000, this.fetcher, {
      "User-Agent":
        "GridPass/0.1 (+https://github.com/jagadeeshgajula94/grid-pass)",
    });
    if (!result.ok) return result;
    const parsed = nominatimPayloadSchema.safeParse(result.value);
    if (!parsed.success)
      return {
        ok: false,
        error: new AppError(
          "UPSTREAM_UNAVAILABLE",
          "Place provider unavailable",
        ),
      };
    return {
      ok: true,
      value: parsed.data.map((place) => ({
        id: `osm-${place.place_id}`,
        name: place.display_name,
        lat: place.lat,
        lng: place.lon,
      })),
    };
  }
}
