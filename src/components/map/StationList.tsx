import type { ReactElement } from "react";
import type { StationDto } from "../../domain/station";
import { NETWORK_LABELS } from "../../domain/station";
import { stationSummary } from "./station-display";
function StationResult({
  station,
  onSelect,
  number,
}: {
  station: StationDto;
  onSelect: (station: StationDto) => void;
  number?: number;
}): ReactElement {
  const summary = stationSummary(station);
  return (
    <button
      className="station-result"
      data-station-id={station.id}
      onClick={() => onSelect(station)}
    >
      <span className="result-topline">
        {NETWORK_LABELS[station.network]}
        <span>{station.distanceKm.toFixed(1)} km</span>
      </span>
      <strong>
        {number && <span className="stop-number">{number}</span>}
        {station.name}
      </strong>
      {"kmAlongRoute" in station &&
        "detourKm" in station &&
        typeof station.kmAlongRoute === "number" &&
        typeof station.detourKm === "number" && (
          <span className="stop-distance">
            {station.kmAlongRoute.toFixed(1)} km along · ~
            {station.detourKm.toFixed(1)} km detour
          </span>
        )}
      <span className="result-bottom">
        <span className={`text-${summary.status}`}>
          ● {summary.available}/{summary.total} available
        </span>
        <span>{summary.power} kW ↗</span>
      </span>
    </button>
  );
}
interface StationListProps {
  area?: boolean;
  radiusKm?: number;
  stations: StationDto[];
  onSelect: (station: StationDto) => void;
  corridor?: boolean;
  bufferKm?: number;
  loading?: boolean;
}
function StationResults({
  stations,
  onSelect,
  corridor,
  loading,
  area = false,
  radiusKm = 5,
}: StationListProps): ReactElement {
  return (
    <div className="station-results" data-loading={loading}>
      <StationSkeleton loading={loading} />
      {!loading && stations.length === 0 && (
        <p className="empty-state">
          {emptyMessage(!!corridor, area, radiusKm)}
        </p>
      )}
      <div className="station-cards" inert={loading} aria-hidden={loading}>
        {stations.map((station, index) => (
          <StationResult
            key={station.id}
            station={station}
            onSelect={onSelect}
            number={corridor ? index + 1 : undefined}
          />
        ))}
      </div>
    </div>
  );
}
function emptyMessage(
  corridor: boolean,
  area: boolean,
  radiusKm: number,
): string {
  if (corridor)
    return "No stations match. Try a wider route buffer or different filters.";
  const scope = area ? "in this area" : `within ${radiusKm} km`;
  const nextRadius = [5, 10, 20].find((radius) => radius > radiusKm);
  if (!area && nextRadius)
    return `No chargers match ${scope}. Try ${nextRadius} km or adjust your filters.`;
  return `No chargers match ${scope}. Try zooming out or moving the map.`;
}
function StationSkeleton({ loading }: { loading?: boolean }): ReactElement {
  return (
    <div
      className="station-skeleton"
      role={loading ? "status" : undefined}
      aria-label={loading ? "Loading stations" : undefined}
      aria-hidden={!loading}
    >
      {[1, 2, 3].map((item) => (
        <div key={item} className="planner-skeleton">
          Finding charging stations…
        </div>
      ))}
    </div>
  );
}
export function StationList({
  stations,
  onSelect,
  corridor = false,
  bufferKm = 5,
  loading = false,
  area = false,
  radiusKm = 5,
}: StationListProps): ReactElement {
  const title = area ? "In this area" : "Nearby charging";
  const label = corridor ? "Corridor stations" : "Nearby stations";
  return (
    <aside
      className="station-list"
      aria-label={area && !corridor ? title : label}
      aria-busy={loading}
    >
      <div className="list-heading">
        <h2>{corridor ? "Charging stops" : title}</h2>
        <span>
          {corridor
            ? `${stations.length} stops · ${bufferKm} km buffer`
            : `${radiusKm} km radius`}
        </span>
      </div>
      <StationResults
        stations={stations}
        onSelect={onSelect}
        corridor={corridor}
        loading={loading}
        area={area}
        radiusKm={radiusKm}
      />
      <p className="map-data-note">Local demo data · Availability may vary</p>
    </aside>
  );
}
