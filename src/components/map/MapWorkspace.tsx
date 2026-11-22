"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { MapControls } from "./MapControls";
import { BottomSheet } from "./BottomSheet";
import { useSheet } from "./use-sheet";
import { FilterBar } from "./FilterBar";
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
function SheetResults({
  state,
  onSelect,
  onFilters,
}: {
  state: WorkspaceState;
  onSelect: (station: StationDto) => void;
  onFilters: () => void;
}): ReactElement {
  return (
    <div className="sheet-body">
      <div aria-label={`${state.filtered.length} matching stations`}>
        <FilterBar
          filters={state.filters}
          onChange={state.setFilters}
          onExpand={() => {
            onFilters();
          }}
        />
      </div>
      <WorkspaceNotice loading={state.loading} error={state.error} />
      <StationList
        stations={state.filtered}
        onSelect={onSelect}
        corridor={state.isCorridor}
        bufferKm={state.planner.bufferKm}
        loading={state.loading}
      />
    </div>
  );
}
function useStationReturnFocus(selected: StationDto | null): void {
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selected && previous.current) {
      const result = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".station-result"),
      ).find((button) => button.dataset.stationId === previous.current);
      result?.focus();
    }
    previous.current = selected?.id;
  }, [selected]);
}
interface ContentProps {
  state: WorkspaceState;
  evModel: string;
  sheet: ReturnType<typeof useSheet>;
}
function WorkspaceContent(props: ContentProps): ReactElement {
  const { state, evModel, sheet } = props;
  const [view, setView] = useState<"list" | "filters">("list");
  useStationReturnFocus(state.selected);
  const select = (station: StationDto): void => {
    state.setSelected(station);
    sheet.setSnap("half");
  };
  if (state.selected)
    return <StationDrawer station={state.selected} onClose={state.close} />;
  if (view === "filters")
    return (
      <FilterBar
        filters={state.filters}
        onChange={state.setFilters}
        expanded
        onClose={() => setView("list")}
      />
    );
  return (
    <>
      <RoutePlanner
        {...state.planner}
        evModel={evModel}
        route={state.route}
        onExpand={() => sheet.setSnap("full")}
        onDestination={(place): void => {
          state.planner.onDestination(place);
          sheet.setSnap("half");
        }}
      />
      <p className="peek-summary" aria-live="polite">
        {state.filtered.length}{" "}
        {state.isCorridor
          ? "charging stops along your route"
          : "stations nearby · within 5 km"}
      </p>
      <SheetResults
        state={state}
        onSelect={select}
        onFilters={() => {
          setView("filters");
          sheet.setSnap("half");
        }}
      />
    </>
  );
}
export function MapWorkspace({
  firstName,
  evModel = "",
}: {
  firstName?: string;
  evModel?: string;
}): ReactElement {
  const state = useWorkspace();
  const sheet = useSheet();
  const [sheetHeight, setSheetHeight] = useState(150);
  return (
    <main className="map-workspace">
      <MapCanvas
        center={state.search.center}
        light={state.light}
        stations={state.filtered}
        selected={state.selected}
        onSelect={(station): void => {
          state.setSelected(station);
          sheet.setSnap("half");
        }}
        corridor={state.isCorridor}
        route={state.route}
        sheetHeight={sheetHeight}
      />
      <MapControls
        firstName={firstName}
        onTheme={state.setLight}
        onRecenter={state.planner.onCurrent}
        fullSheet={sheet.snap === "full"}
      />
      <BottomSheet sheet={sheet} onHeight={setSheetHeight}>
        <WorkspaceContent state={state} evModel={evModel} sheet={sheet} />
      </BottomSheet>
    </main>
  );
}
