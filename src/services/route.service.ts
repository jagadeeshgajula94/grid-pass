import type { CorridorDto, RouteSummaryDto } from "../domain/route";
import {
  greatCircleLine,
  haversineKm,
  projectOntoPolyline,
  routeBounds,
  type Point,
} from "../lib/geo";
import { logEvent } from "../lib/logger";
import { TtlCache } from "../lib/ttl-cache";
import {
  SeedStationRepository,
  type LocalStationRepository,
} from "../repositories/local-station.repository";
import {
  HttpOpenChargeMapRepository,
  type OpenChargeMapRepository,
} from "../repositories/open-charge-map.repository";
import {
  OsrmRouteRepository,
  type RouteRepository,
} from "../repositories/route.repository";
import type { RouteQuery } from "../validation/route.schema";
import { matches, merge } from "./station.service";
function fallbackRoute(origin: Point, destination: Point): RouteSummaryDto {
  const totalDistanceKm = haversineKm(origin, destination);
  return {
    coordinates: greatCircleLine(origin, destination),
    totalDistanceKm,
    estimatedDurationMin: (totalDistanceKm / 55) * 60,
    fallback: true,
  };
}
function routeSamples(coordinates: Point[]): Point[] {
  const count = Math.min(8, coordinates.length);
  return Array.from(
    { length: count },
    (_, index) =>
      coordinates[
        Math.round((index * (coordinates.length - 1)) / Math.max(1, count - 1))
      ],
  ).filter((point): point is Point => point !== undefined);
}
export class RouteService {
  private readonly cache = new TtlCache<RouteSummaryDto>(200, 5 * 60 * 1000);
  constructor(
    private readonly routes: RouteRepository = new OsrmRouteRepository(),
    private readonly remote: OpenChargeMapRepository = new HttpOpenChargeMapRepository(),
    private readonly local: LocalStationRepository = new SeedStationRepository(),
  ) {}
  private async getRoute(
    query: RouteQuery,
    requestId: string,
  ): Promise<RouteSummaryDto> {
    const key = [
      query.origin.lat,
      query.origin.lng,
      query.destination.lat,
      query.destination.lng,
    ]
      .map((value) => value.toFixed(4))
      .join(":");
    const cached = this.cache.get(key);
    if (cached) return structuredClone(cached);
    const result = await this.routes.findRoute(query.origin, query.destination);
    if (!result.ok) logEvent("warn", "route.upstream_unavailable", requestId);
    const route = result.ok
      ? result.value
      : fallbackRoute(query.origin, query.destination);
    this.cache.set(key, route);
    return structuredClone(route);
  }
  async findCorridor(
    query: RouteQuery,
    requestId = crypto.randomUUID(),
  ): Promise<CorridorDto> {
    const route = await this.getRoute(query, requestId);
    const local = this.local.findWithin(
      routeBounds(route.coordinates, query.bufferKm),
    );
    const remote = await Promise.all(
      routeSamples(route.coordinates).map((point) =>
        this.remote.findNearby(point, 50),
      ),
    );
    const upstream = remote.flatMap((result) =>
      result.ok ? result.value : [],
    );
    const stations = merge(local, upstream)
      .map((station) => {
        const projection = projectOntoPolyline(station, route.coordinates);
        return {
          ...station,
          ...projection,
          detourKm: projection.distanceKm * 2,
        };
      })
      .filter((station) =>
        matches(station, {
          ...query,
          ...query.origin,
          radiusKm: query.bufferKm,
        }),
      )
      .sort((a, b) => a.kmAlongRoute - b.kmAlongRoute)
      .slice(0, 300);
    return {
      route,
      stations,
      bufferKm: query.bufferKm,
      sources: ["local", ...(upstream.length ? ["open-charge-map"] : [])],
    };
  }
}
const service = new RouteService();
export function findCorridor(
  query: RouteQuery,
  requestId?: string,
): Promise<CorridorDto> {
  return service.findCorridor(query, requestId);
}
