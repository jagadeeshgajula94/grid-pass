import type { ReactElement } from "react";
import Link from "next/link";
import { ThemeToggle } from "../auth/ThemeToggle";
import { SignOutButton } from "../auth/SignOutButton";
import { FilterBar } from "./FilterBar";
import type { StationFilters } from "./filter-stations";
export function WorkspaceHeader({
  firstName,
  onTheme,
}: {
  firstName?: string;
  onTheme: (light: boolean) => void;
}): ReactElement {
  return (
    <header className="map-header glass">
      <div className="map-identity">
        <a className="brand" href="/map">
          GRID<span>PASS</span>
          <small>CHARGE ANYWHERE</small>
        </a>
        {firstName && <span className="map-greeting">Hello, {firstName}</span>}
      </div>
      <ThemeToggle onChange={onTheme} />
      {firstName ? (
        <SignOutButton />
      ) : (
        <Link className="primary-button" href="/login">
          Sign in
        </Link>
      )}
    </header>
  );
}
interface ToolbarProps {
  count: number;
  filters: StationFilters;
  onFilters: (filters: StationFilters) => void;
}
export function WorkspaceToolbar({
  count,
  filters,
  onFilters,
}: ToolbarProps): ReactElement {
  return (
    <section
      className="planner-filters"
      aria-label={`${count} matching stations`}
    >
      <FilterBar filters={filters} onChange={onFilters} />
    </section>
  );
}
