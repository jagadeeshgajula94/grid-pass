import type { ConnectorDto, Network, StationDto } from "../../domain/station";
export interface StationFilters {
  connector: "all" | ConnectorDto["type"];
  speed: "all" | "ac" | "fast" | "ultra";
  network: "all" | Network;
  availableOnly: boolean;
}
export const DEFAULT_FILTERS: StationFilters = {
  connector: "all",
  speed: "all",
  network: "all",
  availableOnly: false,
};
function matchesSpeed(
  connector: ConnectorDto,
  speed: StationFilters["speed"],
): boolean {
  if (speed === "ac") return connector.type === "TYPE2";
  if (speed === "fast")
    return (
      connector.type !== "TYPE2" &&
      connector.powerKw >= 30 &&
      connector.powerKw <= 60
    );
  if (speed === "ultra") return connector.powerKw >= 120;
  return true;
}
export function filterStations<T extends StationDto>(
  stations: T[],
  filters: StationFilters,
): T[] {
  return stations
    .filter(
      (station) =>
        (filters.network === "all" || station.network === filters.network) &&
        station.connectors.some(
          (connector) =>
            (filters.connector === "all" ||
              connector.type === filters.connector) &&
            matchesSpeed(connector, filters.speed) &&
            (!filters.availableOnly || connector.status === "available"),
        ),
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
