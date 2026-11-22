import { useState, type ReactElement } from "react";
import type { StationDto } from "../../domain/station";
import { NETWORK_LABELS } from "../../domain/station";
import { stationSummary } from "./station-display";
function StationResult({
  station,
  onSelect,
}: {
  station: StationDto;
  onSelect: (station: StationDto) => void;
}): ReactElement {
  const summary = stationSummary(station);
  return (
    <button className="station-result" onClick={() => onSelect(station)}>
      <span className="result-topline">
        {NETWORK_LABELS[station.network]}
        <span>{station.distanceKm.toFixed(1)} km</span>
      </span>
      <strong>{station.name}</strong>
      <span className="result-bottom">
        <span className={`text-${summary.status}`}>
          ● {summary.available}/{summary.total} available
        </span>
        <span>{summary.power} kW ↗</span>
      </span>
    </button>
  );
}
export function StationList({
  stations,
  onSelect,
}: {
  stations: StationDto[];
  onSelect: (station: StationDto) => void;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  return (
    <aside
      className={`station-list glass ${expanded ? "expanded" : ""}`}
      aria-label="Nearby stations"
    >
      <button
        className="sheet-handle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? "⌄ Hide" : "⌃ Explore"} {stations.length} stations
      </button>
      <div className="list-heading">
        <h2>Nearby charging</h2>
        <span>5 km radius</span>
      </div>
      <div className="station-results">
        {stations.length === 0 && (
          <p className="empty-state">
            No stations match. Try another filter or city.
          </p>
        )}
        {stations.map((station) => (
          <StationResult
            key={station.id}
            station={station}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className="map-data-note">Local demo data · Availability may vary</p>
    </aside>
  );
}
