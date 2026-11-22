import type { ReactElement } from "react";
import type { StationDto } from "../../domain/station";
import { NETWORK_BADGES, stationSummary } from "./station-display";
export function StationPin({
  station,
  onSelect,
}: {
  station: StationDto;
  onSelect: (station: StationDto) => void;
}): ReactElement {
  const badge = NETWORK_BADGES[station.network];
  const summary = stationSummary(station);
  return (
    <button
      type="button"
      className={`station-pin pin-${summary.status}`}
      aria-label={`${station.name}, ${summary.available} of ${summary.total} ports available, ${summary.power} kW`}
      onClick={() => onSelect(station)}
    >
      <span className="network-badge" style={{ backgroundColor: badge.color }}>
        {badge.short}
      </span>
      <span>
        {summary.available}/{summary.total} <small>ports</small>
      </span>
      <strong>{summary.power} kW</strong>
    </button>
  );
}
