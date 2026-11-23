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
}: StationListProps): ReactElement {
  return (
    <div className="station-results">
      {loading && (
        <div
          className="station-skeleton"
          role="status"
          aria-label="Loading stations"
        >
          {[1, 2, 3].map((item) => (
            <div key={item} className="planner-skeleton">
              Finding charging stations…
            </div>
          ))}
        </div>
      )}
      {!loading && stations.length === 0 && (
        <p className="empty-state">
          No stations match. Try another filter or city.
        </p>
      )}
      {stations.map((station, index) => (
        <StationResult
          key={station.id}
          station={station}
          onSelect={onSelect}
          number={corridor ? index + 1 : undefined}
        />
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
}: StationListProps): ReactElement {
  return (
    <aside
      className="station-list"
      aria-label={corridor ? "Corridor stations" : "Nearby stations"}
      aria-busy={loading}
    >
      <div className="list-heading">
        <h2>{corridor ? "Charging stops" : "Nearby charging"}</h2>
        <span>
          {corridor
            ? `${stations.length} stops · ${bufferKm} km buffer`
            : "5 km radius"}
        </span>
      </div>
      <StationResults
        stations={stations}
        onSelect={onSelect}
        corridor={corridor}
        loading={loading}
      />
      <p className="map-data-note">Local demo data · Availability may vary</p>
    </aside>
  );
}
