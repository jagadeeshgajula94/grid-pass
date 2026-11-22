import { useEffect, useRef, type ReactElement } from "react";
import { CONNECTORS, NETWORKS, NETWORK_LABELS } from "../../domain/station";
import { DEFAULT_FILTERS, type StationFilters } from "./filter-stations";
import { connectorLabel } from "./station-display";
interface Option<T> {
  value: T;
  label: string;
}
export function filterCount(filters: StationFilters): number {
  return (
    Number(filters.connector !== "all") +
    Number(filters.speed !== "all") +
    Number(filters.network !== "all") +
    Number(filters.availableOnly) +
    Number(!!filters.minimumPowerKw)
  );
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
function FilterPanel({
  filters,
  onChange,
}: {
  filters: StationFilters;
  onChange: (filters: StationFilters) => void;
}): ReactElement {
  return (
    <div className="map-filters" aria-label="Station filters">
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
        onChange={(speed) => onChange({ ...filters, speed, minimumPowerKw: 0 })}
      />
      <FilterSelect
        label="Network operator"
        value={filters.network}
        options={NETWORK_OPTIONS}
        onChange={(network) => onChange({ ...filters, network })}
      />
      <AvailableFilter filters={filters} onChange={onChange} />
    </div>
  );
}

interface FilterProps {
  filters: StationFilters;
  onChange: (filters: StationFilters) => void;
}
function AvailableFilter({ filters, onChange }: FilterProps): ReactElement {
  return (
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
  );
}
function QuickFilters({
  filters,
  onChange,
  onExpand,
}: FilterProps & { onExpand?: () => void }): ReactElement {
  return (
    <div className="quick-filters">
      <button onClick={onExpand}>
        Filters <span className="filter-badge">{filterCount(filters)}</span>
      </button>
      <button
        aria-pressed={filters.availableOnly}
        onClick={() =>
          onChange({ ...filters, availableOnly: !filters.availableOnly })
        }
      >
        Available now
      </button>
      <button
        aria-pressed={!!filters.minimumPowerKw}
        onClick={() =>
          onChange({
            ...filters,
            minimumPowerKw: filters.minimumPowerKw ? 0 : 50,
          })
        }
      >
        Fast ≥50 kW
      </button>
    </div>
  );
}
function ExpandedFilters({
  filters,
  onChange,
  onClose,
}: FilterProps & { onClose?: () => void }): ReactElement {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    back.current?.focus();
  }, []);
  return (
    <>
      <div className="view-heading">
        <button ref={back} onClick={onClose} aria-label="Back to stations">
          ← Back
        </button>
        <h2>Filters</h2>
        <span>{filterCount(filters)} active</span>
      </div>
      <FilterPanel filters={filters} onChange={onChange} />
      <button
        className="reset-filters"
        onClick={() => onChange(DEFAULT_FILTERS)}
      >
        Reset filters
      </button>
    </>
  );
}
export function FilterBar({
  expanded = false,
  ...props
}: FilterProps & {
  expanded?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
}): ReactElement {
  return (
    <section className="filter-section" aria-label="Filter stations">
      {expanded ? <ExpandedFilters {...props} /> : <QuickFilters {...props} />}
    </section>
  );
}
