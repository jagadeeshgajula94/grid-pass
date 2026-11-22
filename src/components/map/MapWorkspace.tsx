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
import type { RouteSummaryDto } from "../../domain/route";
import type { Point } from "../../lib/geo";
import type { StationFilters } from "./filter-stations";
import type { PlannerProps } from "./RoutePlanner";
import { StationList } from "./StationList";
import { StationDrawer } from "./StationDrawer";
import { DEFAULT_FILTERS, filterStations } from "./filter-stations";
import { useStations } from "./use-stations";
import { useLocation } from "./use-location";
import { WorkspaceHeader, WorkspaceToolbar } from "./WorkspaceControls";
import { WorkspaceNotice } from "./WorkspaceNotice";
import { RoutePlanner } from "./RoutePlanner";
import { useRoutePlanner } from "./use-route-planner";
import { useCorridor } from "./use-corridor";
const MapCanvas = dynamic(
  () => import("./MapCanvas").then((module) => module.MapCanvas),
  { ssr: false },
);
interface WorkspaceState {
  search: ReturnType<typeof useLocation>;
  planner: Omit<PlannerProps, "evModel" | "route">;
  light: boolean;
  setLight: (light: boolean) => void;
  filters: StationFilters;
  setFilters: (filters: StationFilters) => void;
  selected: StationDto | null;
  setSelected: (station: StationDto | null) => void;
  filtered: StationDto[];
  loading: boolean;
  error: string;
  isCorridor: boolean;
  route?: RouteSummaryDto;
  close: () => void;
}
function useSelection(
  center: Point,
  destination: PlannerProps["destination"],
  bufferKm: number,
  filters: StationFilters,
): Pick<WorkspaceState, "selected" | "setSelected" | "close"> {
  const [selected, setSelected] = useState<StationDto | null>(null);
  const close = useCallback((): void => setSelected(null), []);
  useEffect(() => {
    setSelected(null);
  }, [center, destination, bufferKm, filters]);
  return { selected, setSelected, close };
}
function useWorkspace(): WorkspaceState {
  const search = useLocation();
  const planner = useRoutePlanner(search);
  const [light, setLight] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const selection = useSelection(
    search.center,
    planner.destination,
    planner.bufferKm,
    filters,
  );
  const nearby = useStations(
    search.center,
    search.resolved && !planner.destination,
  );
  const corridor = useCorridor(
    search.center,
    search.resolved ? planner.destination : null,
    planner.bufferKm,
  );
  const isCorridor = !!planner.destination;
  const { loading, error } = isCorridor ? corridor : nearby;
  const filtered = useMemo(
    () =>
      isCorridor
        ? filterStations(corridor.data?.stations ?? [], filters).sort(
            (a, b) => a.kmAlongRoute - b.kmAlongRoute,
          )
        : filterStations(nearby.stations, filters),
    [nearby.stations, corridor.data, filters, isCorridor],
  );
  return {
    search,
    planner,
    light,
    setLight,
    filters,
    setFilters,
    ...selection,
    filtered,
    loading,
    error,
    isCorridor,
    route: corridor.data?.route,
  };
}
export function MapWorkspace({
  firstName,
  evModel = "",
}: {
  firstName: string;
  evModel?: string;
}): ReactElement {
  const state = useWorkspace();
  return (
    <main className="map-workspace">
      <MapCanvas
        center={state.search.center}
        light={state.light}
        stations={state.filtered}
        selected={state.selected}
        onSelect={state.setSelected}
        corridor={state.isCorridor}
        route={state.route}
      />
      <WorkspaceHeader firstName={firstName} onTheme={state.setLight} />
      <section className="planner-toolbar">
        <RoutePlanner
          {...state.planner}
          evModel={evModel}
          route={state.route}
        />
        <WorkspaceToolbar
          count={state.filtered.length}
          filters={state.filters}
          onFilters={state.setFilters}
        />
      </section>
      <WorkspaceNotice loading={state.loading} error={state.error} />
      <StationList
        stations={state.filtered}
        onSelect={state.setSelected}
        corridor={state.isCorridor}
        bufferKm={state.planner.bufferKm}
        loading={state.loading}
      />
      {state.selected && (
        <StationDrawer station={state.selected} onClose={state.close} />
      )}
    </main>
  );
}
