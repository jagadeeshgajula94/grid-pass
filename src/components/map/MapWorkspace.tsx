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
import { useMapArea } from "./use-map-area";
import { LocationBanner } from "./LocationBanner";
import { RadarControls } from "./RoutePlanner";
const MapCanvas = dynamic(
  () => import("./MapCanvas").then((module) => module.MapCanvas),
  { ssr: false },
);
type DiscoveryState = ReturnType<typeof useMapArea> &
  ReturnType<typeof useStations> & {
    center: Point;
    radiusKm: number;
    radarRadiusKm: number;
    onRadius: (radiusKm: number) => void;
  };
interface WorkspaceState {
  discovery: DiscoveryState;
  fitRequest: number;
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
function requestFitAfter<Args extends unknown[]>(
  action: (...args: Args) => void,
  requestFit: () => void,
): (...args: Args) => void {
  return (...args): void => {
    action(...args);
    requestFit();
  };
}
function usePlannerIntents(
  planner: WorkspaceState["planner"],
  resetArea: () => void,
): Pick<WorkspaceState, "planner" | "fitRequest"> {
  const [fitRequest, setFitRequest] = useState(0);
  const requestFit = (): void => {
    resetArea();
    setFitRequest((request) => request + 1);
  };
  return {
    fitRequest,
    planner: {
      ...planner,
      onCurrent: requestFitAfter(planner.onCurrent, requestFit),
      onOrigin: requestFitAfter(planner.onOrigin, requestFit),
      onDestination: requestFitAfter(planner.onDestination, requestFit),
      onBuffer: (buffer): void => {
        if (buffer === planner.bufferKm) return;
        planner.onBuffer(buffer);
        requestFit();
      },
      onClear: requestFitAfter(planner.onClear, requestFit),
      onSwap: requestFitAfter(planner.onSwap, requestFit),
    },
  };
}
function useDiscovery(
  search: ReturnType<typeof useLocation>,
  routeActive: boolean,
): DiscoveryState {
  const [radiusKm, setRadius] = useState(5);
  const area = useMapArea(!routeActive);
  const target = area.area ?? { center: search.center, radiusKm };
  const stations = useStations(
    target.center,
    search.resolved && !routeActive,
    target.radiusKm,
    area.area ? 400 : 0,
  );
  return {
    ...area,
    ...target,
    ...stations,
    radarRadiusKm: radiusKm,
    onRadius: (next): void => {
      if (next === radiusKm && !area.area) return;
      area.reset();
      setRadius(next);
    },
  };
}
function useWorkspaceData(
  search: ReturnType<typeof useLocation>,
  planner: WorkspaceState["planner"],
  discovery: DiscoveryState,
): Pick<
  WorkspaceState,
  | "filters"
  | "setFilters"
  | "filtered"
  | "loading"
  | "error"
  | "isCorridor"
  | "route"
> {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const corridor = useCorridor(
    search.center,
    search.resolved ? planner.destination : null,
    planner.bufferKm,
  );
  const isCorridor = !!planner.destination;
  const { loading, error } = isCorridor ? corridor : discovery;
  const filtered = useMemo(
    () =>
      isCorridor
        ? filterStations(corridor.data?.stations ?? [], filters).sort(
            (a, b) => a.kmAlongRoute - b.kmAlongRoute,
          )
        : filterStations(discovery.stations, filters),
    [discovery.stations, corridor.data, filters, isCorridor],
  );
  return {
    filters,
    setFilters,
    filtered,
    loading,
    error,
    isCorridor,
    route: corridor.data?.route,
  };
}
function useWorkspace(): WorkspaceState {
  const search = useLocation();
  const basePlanner = useRoutePlanner(search);
  const discovery = useDiscovery(search, !!basePlanner.destination);
  const { planner, fitRequest } = usePlannerIntents(
    basePlanner,
    discovery.reset,
  );
  const data = useWorkspaceData(search, planner, discovery);
  const selection = useSelection(
    discovery.center,
    planner.destination,
    planner.bufferKm,
    data.filters,
  );
  const [light, setLight] = useState(false);
  return {
    search,
    planner,
    fitRequest,
    discovery,
    light,
    setLight,
    ...data,
    ...selection,
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
        area={!!state.discovery.area && !state.isCorridor}
        radiusKm={state.discovery.radiusKm}
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
  searchRequest?: number;
  onSearchReady?: () => void;
}
function discoverySummary(state: WorkspaceState): string {
  if (state.isCorridor) return "charging stops along your route";
  if (state.discovery.area) return "stations · In this area";
  return `stations nearby · within ${state.discovery.radiusKm} km`;
}
function PlannerContent({
  state,
  evModel,
  sheet,
  searchRequest,
  onSearchReady,
}: ContentProps): ReactElement {
  return (
    <>
      <RoutePlanner
        {...state.planner}
        evModel={evModel}
        route={state.route}
        searchRequest={searchRequest}
        onSearchReady={onSearchReady}
        onExpand={() => sheet.setSnap("full")}
        onDestination={(place): void => {
          state.planner.onDestination(place);
          sheet.setSnap("half");
        }}
      />
      {!state.isCorridor && (
        <RadarControls
          radiusKm={state.discovery.radarRadiusKm}
          area={!!state.discovery.area}
          onRadius={state.discovery.onRadius}
          onBack={state.planner.onCurrent}
        />
      )}
      <p className="peek-summary" aria-live="polite">
        {state.filtered.length} {discoverySummary(state)}
      </p>
    </>
  );
}
function WorkspaceContent(props: ContentProps): ReactElement {
  const { state, sheet, searchRequest } = props;
  const close = state.close;
  const [view, setView] = useState<"list" | "filters">("list");
  useEffect(() => {
    if (searchRequest) {
      setView("list");
      close();
    }
  }, [searchRequest, close]);
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
      <PlannerContent {...props} />
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
function WorkspaceMap({
  state,
  sheet,
  sheetHeight,
}: {
  state: WorkspaceState;
  sheet: ReturnType<typeof useSheet>;
  sheetHeight: number;
}): ReactElement {
  return (
    <MapCanvas
      fitRequest={state.fitRequest}
      center={state.discovery.center}
      position={state.search.position}
      accuracy={state.search.accuracy}
      radiusKm={state.discovery.radiusKm}
      area={!!state.discovery.area && !state.isCorridor}
      onArea={state.discovery.onArea}
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
  const [searchRequest, setSearchRequest] = useState(0);
  const searchReady = useCallback((): void => setSearchRequest(0), []);
  return (
    <main className="map-workspace">
      <WorkspaceMap state={state} sheet={sheet} sheetHeight={sheetHeight} />
      <MapControls
        firstName={firstName}
        onTheme={state.setLight}
        onRecenter={state.planner.onCurrent}
        fullSheet={sheet.snap === "full"}
      />
      <BottomSheet sheet={sheet} onHeight={setSheetHeight}>
        <LocationBanner
          errorKind={state.search.errorKind}
          onRetry={state.planner.onCurrent}
          onSearch={() => {
            setSearchRequest((request) => request + 1);
            sheet.setSnap("full");
          }}
        />
        <WorkspaceContent
          state={state}
          evModel={evModel}
          sheet={sheet}
          searchRequest={searchRequest}
          onSearchReady={searchReady}
        />
      </BottomSheet>
    </main>
  );
}
