import type { ReactElement } from "react";
import { CONNECTORS, NETWORKS, NETWORK_LABELS } from "../../domain/station";
import type { StationFilters } from "./filter-stations";
import { connectorLabel } from "./station-display";
interface Option<T> {
  value: T;
  label: string;
}
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}): ReactElement {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(event) => {
          const option = options.find(
            (item) => item.value === event.target.value,
          );
          if (option) onChange(option.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
const CONNECTOR_OPTIONS: Option<StationFilters["connector"]>[] = [
  { value: "all", label: "All connectors" },
  ...CONNECTORS.map((value) => ({
    value,
    label: connectorLabel(value),
  })),
];
const SPEED_OPTIONS: Option<StationFilters["speed"]>[] = [
  { value: "all", label: "All speeds" },
  { value: "ac", label: "AC" },
  { value: "fast", label: "DC Fast · 30–60 kW" },
  { value: "ultra", label: "Ultra-Fast · 120 kW+" },
];
const NETWORK_OPTIONS: Option<StationFilters["network"]>[] = [
  { value: "all", label: "All networks" },
  ...NETWORKS.map((value) => ({
    value,
    label:
      Object.entries(NETWORK_LABELS).find(([key]) => key === value)?.[1] ??
      "Other",
  })),
];
export function FilterBar({
  filters,
  onChange,
}: {
  filters: StationFilters;
  onChange: (filters: StationFilters) => void;
}): ReactElement {
  return (
    <div
      className="map-filters glass backdrop-blur-xl"
      aria-label="Station filters"
    >
      <FilterSelect
        label="Connector"
        value={filters.connector}
        options={CONNECTOR_OPTIONS}
        onChange={(connector) => onChange({ ...filters, connector })}
      />
      <FilterSelect
        label="Speed"
        value={filters.speed}
        options={SPEED_OPTIONS}
        onChange={(speed) => onChange({ ...filters, speed })}
      />
      <FilterSelect
        label="Network operator"
        value={filters.network}
        options={NETWORK_OPTIONS}
        onChange={(network) => onChange({ ...filters, network })}
      />
      <label className="availability-toggle">
        <input
          type="checkbox"
          checked={filters.availableOnly}
          onChange={(event) =>
            onChange({ ...filters, availableOnly: event.target.checked })
          }
        />
        Available Now
      </label>
    </div>
  );
}
