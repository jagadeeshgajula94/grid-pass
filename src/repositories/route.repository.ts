import type { Point } from "../lib/geo";
import type { RouteSummaryDto } from "../domain/route";
import { AppError } from "../lib/errors";
import type { Result } from "../lib/result";
import { upstreamFetch } from "../lib/upstream-fetch";
import { osrmPayloadSchema } from "../validation/route.schema";
export interface RouteRepository {
  findRoute(
    origin: Point,
    destination: Point,
  ): Promise<Result<RouteSummaryDto, AppError>>;
}
export class OsrmRouteRepository implements RouteRepository {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async findRoute(
    origin: Point,
    destination: Point,
  ): Promise<Result<RouteSummaryDto, AppError>> {
    const url = new URL(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=simplified&geometries=geojson`,
    );
    const result = await upstreamFetch(url, 4000, this.fetcher);
    if (!result.ok) return result;
    const parsed = osrmPayloadSchema.safeParse(result.value);
    const route = parsed.success ? parsed.data.routes[0] : undefined;
    if (!route)
      return {
        ok: false,
        error: new AppError(
          "UPSTREAM_UNAVAILABLE",
          "Route provider unavailable",
        ),
      };
    return {
      ok: true,
      value: {
        coordinates: route.geometry.coordinates.map(([lng, lat]) => ({
          lat,
          lng,
        })),
        totalDistanceKm: route.distance / 1000,
        estimatedDurationMin: route.duration / 60,
        fallback: false,
      },
    };
  }
}
