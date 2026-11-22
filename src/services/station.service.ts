import type { StationDto } from "../domain/station";
import { boundingBox, gridCellKey, haversineKm } from "../lib/geo";
import { TtlCache } from "../lib/ttl-cache";
import { logEvent } from "../lib/logger";
import {
  SeedStationRepository,
  type LocalStationRepository,
} from "../repositories/local-station.repository";
import {
  HttpOpenChargeMapRepository,
  type OpenChargeMapRepository,
} from "../repositories/open-charge-map.repository";
import type { NearbyQuery } from "../validation/stations.schema";

interface Candidates {
  stations: StationDto[];
  sources: string[];
}
export interface NearbyStations extends Candidates {
  center: { lat: number; lng: number };
  radiusKm: number;
}
function similarName(a: string, b: string): boolean {
  const normalize = (name: string): string =>
    name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  const left = normalize(a);
  const right = normalize(b);
  return (
    left.length > 0 &&
    right.length > 0 &&
    (left.includes(right) || right.includes(left))
  );
}
function merge(local: StationDto[], remote: StationDto[]): StationDto[] {
  const merged = [...local];
  for (const station of remote) {
    if (
      !merged.some(
        (existing) =>
          haversineKm(existing, station) <= 0.05 &&
          similarName(existing.name, station.name),
      )
    )
      merged.push(station);
  }
  return merged;
}
function matches(station: StationDto, query: NearbyQuery): boolean {
  return (
    station.distanceKm <= query.radiusKm &&
    (!query.network || station.network === query.network) &&
    station.connectors.some(
      (connector) =>
        (!query.connector || connector.type === query.connector) &&
        (query.minKw === undefined || connector.powerKw >= query.minKw) &&
        (!query.availableOnly || connector.status === "available"),
    )
  );
}
export class StationService {
  private readonly cache = new TtlCache<Candidates>(200, 5 * 60 * 1000);
  constructor(
    private readonly remote: OpenChargeMapRepository = new HttpOpenChargeMapRepository(),
    private readonly local: LocalStationRepository = new SeedStationRepository(),
  ) {}
  async findNearby(
    query: NearbyQuery,
    requestId = crypto.randomUUID(),
  ): Promise<NearbyStations> {
    const key = gridCellKey(query.lat, query.lng, query.radiusKm);
    let candidates = this.cache.get(key);
    if (!candidates) {
      const center = {
        lat: Math.round(query.lat * 20) / 20,
        lng: Math.round(query.lng * 20) / 20,
      };
      const radius = query.radiusKm + 4;
      const local = this.local.findWithin(
        boundingBox(center.lat, center.lng, radius),
      );
      const remote = await this.remote.findNearby(center, radius);
      if (!remote.ok)
        logEvent("warn", "stations.upstream_unavailable", requestId);
      candidates = {
        stations: merge(local, remote.ok ? remote.value : []),
        sources: [
          "local",
          ...(remote.ok && remote.value.length ? ["open-charge-map"] : []),
        ],
      };
      this.cache.set(key, candidates);
    }
    const stations = candidates.stations
      .map((station) => ({
        ...structuredClone(station),
        distanceKm: haversineKm(query, station),
      }))
      .filter((station) => matches(station, query))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 300);
    return {
      stations,
      center: { lat: query.lat, lng: query.lng },
      radiusKm: query.radiusKm,
      sources: [...candidates.sources],
    };
  }
}
const stationService = new StationService();
export function findNearby(
  query: NearbyQuery,
  requestId?: string,
): Promise<NearbyStations> {
  return stationService.findNearby(query, requestId);
}
