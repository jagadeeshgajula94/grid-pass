import {
  NETWORKS,
  type ConnectorDto,
  type Network,
  type StationDto,
} from "../domain/station";
import { AppError } from "../lib/errors";
import type { Result } from "../lib/result";
import { env } from "../lib/env";
import { ocmPayloadSchema, type OcmPoi } from "../validation/stations.schema";
import type { Point } from "../lib/geo";
import { upstreamFetch } from "../lib/upstream-fetch";

export interface OpenChargeMapRepository {
  findNearby(
    center: Point,
    radiusKm: number,
  ): Promise<Result<StationDto[], AppError>>;
}
function networkOf(title: string): Network {
  const normalized = title.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  return (
    NETWORKS.find((network) =>
      normalized.includes(network.replaceAll("-", "")),
    ) ?? "other"
  );
}
function connectorsOf(poi: OcmPoi): ConnectorDto[] {
  return (poi.Connections ?? []).flatMap((connection) => {
    const type = new Map<number, ConnectorDto["type"]>([
      [33, "CCS2"],
      [25, "TYPE2"],
      [1036, "TYPE2"],
      [2, "CHADEMO"],
    ]).get(connection.ConnectionTypeID);
    return type
      ? Array.from({ length: connection.Quantity }, () => ({
          type,
          powerKw: connection.PowerKW ?? 0,
          tariffInrPerKwh: null,
          status:
            connection.StatusType?.IsOperational === true
              ? ("available" as const)
              : ("offline" as const),
        }))
      : [];
  });
}
function toStation(poi: OcmPoi): StationDto {
  return {
    id: `ocm-${poi.ID}`,
    name: poi.AddressInfo.Title || "Charging station",
    network: networkOf(poi.OperatorInfo?.Title ?? ""),
    lat: poi.AddressInfo.Latitude,
    lng: poi.AddressInfo.Longitude,
    distanceKm: 0,
    address: [poi.AddressInfo.AddressLine1, poi.AddressInfo.Town]
      .filter(Boolean)
      .join(", ")
      .slice(0, 300),
    connectors: connectorsOf(poi),
    amenities: [],
    lastUpdated: poi.DateLastStatusUpdate ?? "1970-01-01T00:00:00.000Z",
  };
}
export class HttpOpenChargeMapRepository implements OpenChargeMapRepository {
  constructor(
    private readonly apiKey = env.OPEN_CHARGE_MAP_API_KEY,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async findNearby(
    center: Point,
    radiusKm: number,
  ): Promise<Result<StationDto[], AppError>> {
    if (!this.apiKey) return { ok: true, value: [] };
    try {
      const url = new URL("https://api.openchargemap.io/v3/poi");
      url.search = new URLSearchParams({
        output: "json",
        latitude: String(center.lat),
        longitude: String(center.lng),
        distance: String(radiusKm),
        distanceunit: "KM",
        maxresults: "250",
        compact: "false",
        verbose: "true",
      }).toString();
      const response = await upstreamFetch(url, 3000, this.fetcher, {
        "X-API-Key": this.apiKey,
      });
      if (!response.ok) return response;
      const parsed = ocmPayloadSchema.safeParse(response.value);
      if (!parsed.success) throw new Error("Invalid upstream payload");
      return {
        ok: true,
        value: parsed.data
          .map(toStation)
          .filter((station) => station.connectors.length > 0),
      };
    } catch {
      return {
        ok: false,
        error: new AppError(
          "UPSTREAM_UNAVAILABLE",
          "Station provider unavailable",
        ),
      };
    }
  }
}
