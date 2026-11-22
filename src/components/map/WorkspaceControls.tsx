import type { ReactElement } from "react";
import { ThemeToggle } from "../auth/ThemeToggle";
import { SignOutButton } from "../auth/SignOutButton";
import { LocationPresets } from "./LocationPresets";
import { FilterBar } from "./FilterBar";
import type { StationFilters } from "./filter-stations";
import type { useLocation } from "./use-location";
export function WorkspaceHeader({
  firstName,
  onTheme,
}: {
  firstName: string;
  onTheme: (light: boolean) => void;
}): ReactElement {
  return (
    <header className="map-header glass">
      <div className="map-identity">
        <a className="brand" href="/map">
          GRID<span>PASS</span>
          <small>CHARGE ANYWHERE</small>
        </a>
        <span className="map-greeting">Hello, {firstName}</span>
      </div>
      <ThemeToggle onChange={onTheme} />
      <SignOutButton />
    </header>
  );
}
interface ToolbarProps {
  search: ReturnType<typeof useLocation>;
  count: number;
  filters: StationFilters;
  onFilters: (filters: StationFilters) => void;
}
export function WorkspaceToolbar({
  search,
  count,
  filters,
  onFilters,
}: ToolbarProps): ReactElement {
  return (
    <section className="map-toolbar">
      <div className="location-row glass">
        <LocationPresets
          value={search.location}
          onSelect={search.choose}
          onCurrent={search.locate}
        />
        <span className="location-chip" role="status">
          {search.status}
        </span>
        <strong>{count} stations within 5 km</strong>
      </div>
      <FilterBar filters={filters} onChange={onFilters} />
    </section>
  );
}
