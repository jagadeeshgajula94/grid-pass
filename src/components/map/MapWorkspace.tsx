"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import dynamic from "next/dynamic";
import type { StationDto } from "../../domain/station";
import { StationList } from "./StationList";
import { StationDrawer } from "./StationDrawer";
import { DEFAULT_FILTERS, filterStations } from "./filter-stations";
import { useStations } from "./use-stations";
import { useLocation } from "./use-location";
import { WorkspaceHeader, WorkspaceToolbar } from "./WorkspaceControls";
import { WorkspaceNotice } from "./WorkspaceNotice";
const MapCanvas = dynamic(
  () => import("./MapCanvas").then((module) => module.MapCanvas),
  { ssr: false },
);
export function MapWorkspace({
  firstName,
}: {
  firstName: string;
}): ReactElement {
  const search = useLocation();
  const [light, setLight] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<StationDto | null>(null);
  const { stations, loading, error } = useStations(search.center);
  const filtered = useMemo(
    () => filterStations(stations, filters),
    [stations, filters],
  );
  const close = useCallback((): void => setSelected(null), []);
  useEffect(() => {
    setSelected(null);
  }, [search.center]);
  return (
    <main className="map-workspace">
      <MapCanvas
        center={search.center}
        light={light}
        stations={filtered}
        selected={selected}
        onSelect={setSelected}
      />
      <WorkspaceHeader firstName={firstName} onTheme={setLight} />
      <WorkspaceToolbar
        search={search}
        count={filtered.length}
        filters={filters}
        onFilters={setFilters}
      />
      <WorkspaceNotice loading={loading} error={error} />
      <StationList stations={filtered} onSelect={setSelected} />
      {selected && <StationDrawer station={selected} onClose={close} />}
    </main>
  );
}
