import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type PaddingOptions,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationDto } from "../../domain/station";
import {
  boundingBox,
  routeBounds,
  type BoundingBox,
  type Point,
} from "../../lib/geo";
import { StationMarkers } from "./StationMarkers";
import { cameraMotion, updateAccuracy, updateRoute } from "./map-layers";
import type { RouteSummaryDto } from "../../domain/route";
import { CorridorMarkers } from "./CorridorMarkers";
interface CanvasProps {
  position?: Point | null;
  accuracy?: number | null;
  radiusKm?: number;
  area?: boolean;
  onArea?: (bounds: BoundingBox) => void;
  fitRequest?: number;
  sheetHeight?: number;
  corridor?: boolean;
  route?: RouteSummaryDto;
  center: Point;
  light: boolean;
  stations: StationDto[];
  selected: StationDto | null;
  highlighted?: StationDto | null;
  highlightRequest?: number;
  onSelect: (station: StationDto) => void;
}
function styleUrl(light: boolean): string {
  return `https://basemaps.cartocdn.com/gl/${light ? "voyager" : "dark-matter"}-gl-style/style.json`;
}
function mapStyle(height = 150): CSSProperties {
  return { "--sheet-offset": `${height + 12}px` } as CSSProperties;
}
function collapseAttribution(container: HTMLElement | null): void {
  const attribution = container?.querySelector(".maplibregl-ctrl-attrib");
  attribution?.classList.remove("maplibregl-compact-show");
  attribution?.removeAttribute("open");
}
function UserPosition({
  map,
  center,
  accuracy,
}: {
  map: MapLibreMap;
  center: Point;
  accuracy?: number | null;
}): ReactElement {
  const [element] = useState(() => document.createElement("div"));
  useEffect(() => {
    element.className = "user-location-marker";
    const marker = new Marker({ element })
      .setLngLat([center.lng, center.lat])
      .addTo(map);
    return (): void => {
      marker.remove();
    };
  }, [map, center, element]);
  return createPortal(
    <div
      className="user-position"
      role="img"
      aria-label={
        accuracy != null && accuracy > 1000
          ? "Your approximate location"
          : "Your location"
      }
    >
      {accuracy != null && accuracy > 1000 && (
        <span className="position-caption">Approximate</span>
      )}
    </div>,
    element,
  );
}
function useMap(): {
  container: React.RefObject<HTMLDivElement | null>;
  map: MapLibreMap | null;
  error: string;
} {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!container.current) return;
    try {
      setWorkerUrl(
        new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url)
          .href,
      );
      const instance = new MapLibreMap({
        container: container.current,
        style: styleUrl(false),
        center: [78.4867, 17.385],
        zoom: 12,
        attributionControl: { compact: true },
      });
      instance.addControl(new NavigationControl(), "bottom-right");
      instance.on("error", () =>
        setError(
          "Map tiles unavailable. You can still browse nearby stations.",
        ),
      );
      instance.on("load", () => {
        collapseAttribution(container.current);
        setError("");
      });
      setMap(instance);
      return (): void => {
        instance.remove();
      };
    } catch {
      setError(
        "Map unavailable on this device. Browse the station list instead.",
      );
    }
  }, []);
  return { container, map, error };
}
function RecommendationHighlight({
  map,
  station,
}: {
  map: MapLibreMap;
  station: StationDto;
}): ReactElement {
  const [element] = useState(() => document.createElement("div"));
  useEffect(() => {
    element.className = "recommendation-map-highlight";
    const marker = new Marker({ element })
      .setLngLat([station.lng, station.lat])
      .addTo(map);
    return (): void => {
      marker.remove();
    };
  }, [map, station, element]);
  return createPortal(
    <div
      className="recommendation-halo"
      role="img"
      aria-label={`Recommended charger: ${station.name}`}
    />,
    element,
  );
}
function flyToPreview(
  map: MapLibreMap,
  station: StationDto,
  props: CanvasProps,
): void {
  map.flyTo(
    {
      ...cameraMotion(),
      center: [station.lng, station.lat],
      zoom: 15,
      padding: visibleMapPadding(props.sheetHeight ?? 150),
      offset: [0, 0],
    },
    props.area && !props.corridor
      ? { recommendationAreaMove: true }
      : undefined,
  );
}
function useMapView(map: MapLibreMap | null, props: CanvasProps): void {
  const {
    center,
    light,
    selected,
    corridor = false,
    route,
    area,
    radiusKm,
    position,
    accuracy,
  } = props;
  useEffect(() => {
    map?.setStyle(styleUrl(light));
  }, [map, light]);
  useEffect(() => {
    if (!map) return;
    const draw = (): void => {
      updateRoute(map, corridor, center, route, { area, radiusKm });
      updateAccuracy(map, position, accuracy);
    };
    map.on("style.load", draw);
    if (map.isStyleLoaded()) draw();
    return (): void => {
      map.off("style.load", draw);
    };
  }, [map, center, corridor, route, area, radiusKm, position, accuracy]);
  useEffect(() => {
    if (map && selected)
      map.flyTo({
        ...cameraMotion(),
        center: [selected.lng, selected.lat],
        zoom: 15,
        offset: window.innerWidth >= 768 ? [190, 0] : [0, -150],
      });
  }, [map, selected, route, corridor]);
}
function visibleMapPadding(sheetHeight: number): Required<PaddingOptions> {
  if (window.innerWidth >= 768)
    return { left: 424, right: 80, top: 80, bottom: 40 };
  return {
    left: 48,
    right: 96,
    top: Math.min(100, Math.max(24, (window.innerHeight - sheetHeight) * 0.2)),
    bottom: sheetHeight + 24,
  };
}
interface OverviewState {
  area: boolean;
  map: MapLibreMap;
  intent: string;
  layout: string;
  selected: boolean;
  highlighted: boolean;
  highlightRequest: number;
  fitRequest: number;
}
function overviewLayout(sheetHeight = 150): string {
  return JSON.stringify([
    window.innerWidth,
    window.innerHeight,
    visibleMapPadding(sheetHeight),
  ]);
}
function overviewState(map: MapLibreMap, props: CanvasProps): OverviewState {
  return {
    area: props.area ?? false,
    map,
    intent: JSON.stringify([
      props.center.lat,
      props.center.lng,
      props.corridor ?? false,
      props.corridor ? props.route : null,
      props.fitRequest ?? 0,
      props.radiusKm ?? 5,
    ]),
    layout: overviewLayout(props.sheetHeight),
    selected: !!props.selected,
    highlighted: !!props.highlighted,
    highlightRequest: props.highlightRequest ?? 0,
    fitRequest: props.fitRequest ?? 0,
  };
}
function needsOverview(
  previous: OverviewState | null,
  next: OverviewState,
): boolean {
  return (
    !next.selected &&
    (!previous ||
      previous.map !== next.map ||
      (!next.area &&
        (previous.selected ||
          (previous.highlighted && !next.highlighted) ||
          previous.area ||
          previous.intent !== next.intent ||
          previous.layout !== next.layout)))
  );
}
function fitOverview(map: MapLibreMap, props: CanvasProps): void {
  const { center, corridor, route, sheetHeight } = props;
  const box =
    corridor && route
      ? routeBounds(route.coordinates, 1)
      : boundingBox(center.lat, center.lng, props.radiusKm ?? 5);
  map.fitBounds(
    [
      [box.west, box.south],
      [box.east, box.north],
    ],
    {
      padding: visibleMapPadding(sheetHeight ?? 150),
      ...cameraMotion(),
      maxZoom: corridor ? 13 : 14,
    },
  );
}
interface PreviewIntent {
  station: StationDto;
  layout: string | null;
}
interface CameraState {
  previous: OverviewState | null;
  preview: PreviewIntent | null;
  timer?: number;
}
function updatePreview(
  state: CameraState,
  props: CanvasProps,
  current: OverviewState,
): void {
  const previous = state.previous;
  if (
    props.highlighted &&
    (previous?.map !== current.map ||
      !previous.highlighted ||
      previous.highlightRequest !== current.highlightRequest)
  ) {
    state.preview = { station: props.highlighted, layout: null };
  } else if (
    !props.highlighted ||
    previous?.fitRequest !== current.fitRequest ||
    (!current.area && previous?.intent !== current.intent)
  ) {
    state.preview = null;
  }
}
function schedulePreview(
  map: MapLibreMap,
  props: CanvasProps,
  current: OverviewState,
  state: CameraState,
): void {
  const preview = state.preview;
  if (!preview || preview.layout === current.layout) return;
  state.timer = window.setTimeout(() => {
    if (state.preview !== preview) return;
    preview.layout = current.layout;
    flyToPreview(map, preview.station, props);
  }, 100);
}
function updateCamera(
  map: MapLibreMap,
  props: CanvasProps,
  state: CameraState,
): void {
  const current = overviewState(map, props);
  updatePreview(state, props, current);
  window.clearTimeout(state.timer);
  if (state.preview && !current.selected)
    schedulePreview(map, props, current, state);
  else if (needsOverview(state.previous, current)) fitOverview(map, props);
  state.previous = current;
}
function useVisibleMap(map: MapLibreMap | null, props: CanvasProps): void {
  const camera = useRef<CameraState>({ previous: null, preview: null });
  useLayoutEffect(() => {
    if (!map) return;
    const state = camera.current;
    const start = (event: { originalEvent?: unknown } = {}): void => {
      if (!event.originalEvent) return;
      state.preview = null;
      window.clearTimeout(state.timer);
    };
    map.on("movestart", start);
    return (): void => {
      map.off("movestart", start);
      window.clearTimeout(state.timer);
    };
  }, [map]);
  useEffect(() => {
    if (!map) return;
    const state = camera.current;
    const update = (): void => updateCamera(map, props, state);
    update();
    window.addEventListener("resize", update);
    return (): void => {
      window.removeEventListener("resize", update);
      window.clearTimeout(state.timer);
    };
  }, [map, props]);
}
function exposedMapBounds(
  map: MapLibreMap,
  padding: Required<PaddingOptions>,
): BoundingBox {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const left = Math.min(padding.left, Math.max(0, width - 1));
  const top = Math.min(padding.top, Math.max(0, height - 1));
  const right = Math.max(left + 1, width - padding.right);
  const bottom = Math.max(top + 1, height - padding.bottom);
  const corners: [number, number][] = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
  ];
  const points = corners.map((corner) => map.unproject(corner));
  return {
    west: Math.min(...points.map((point) => point.lng)),
    east: Math.max(...points.map((point) => point.lng)),
    south: Math.min(...points.map((point) => point.lat)),
    north: Math.max(...points.map((point) => point.lat)),
  };
}
interface AreaMoveEvent {
  originalEvent?: unknown;
  recommendationAreaMove?: boolean;
}
function listenForAreaMoves(
  map: MapLibreMap,
  onArea: NonNullable<CanvasProps["onArea"]>,
  area: boolean,
  sheetHeight: () => number,
): () => void {
  let userMove = false;
  let pending: number | undefined;
  const cancel = (): void => window.clearTimeout(pending);
  const refresh = (): void =>
    onArea(exposedMapBounds(map, visibleMapPadding(sheetHeight())));
  const start = (event: AreaMoveEvent = {}): void => {
    cancel();
    userMove = !!event.originalEvent;
  };
  const finish = (event: AreaMoveEvent = {}): void => {
    const user =
      userMove ||
      !!event.originalEvent ||
      (area && event.recommendationAreaMove === true);
    userMove = false;
    if (!user) return;
    cancel();
    if (event.recommendationAreaMove) pending = window.setTimeout(refresh, 400);
    else refresh();
  };
  map.on("movestart", start);
  map.on("moveend", finish);
  return (): void => {
    cancel();
    map.off("movestart", start);
    map.off("moveend", finish);
  };
}
function useMapAreaEvents(map: MapLibreMap | null, props: CanvasProps): void {
  const {
    onArea,
    corridor,
    area,
    fitRequest,
    selected,
    sheetHeight = 150,
  } = props;
  const height = useRef(sheetHeight);
  useEffect(() => {
    height.current = sheetHeight;
  }, [sheetHeight]);
  useLayoutEffect(() => {
    if (!map || corridor || !onArea) return;
    return listenForAreaMoves(map, onArea, !!area, () => height.current);
  }, [map, onArea, corridor, area, fitRequest, selected]);
}
export function MapCanvas(props: CanvasProps): ReactElement {
  const { stations, onSelect, corridor = false } = props;
  const { container, map, error } = useMap();
  useMapAreaEvents(map, props);
  useMapView(map, props);
  useVisibleMap(map, props);
  return (
    <>
      <div
        className="map-canvas"
        ref={container}
        aria-label="Charging stations map"
        style={mapStyle(props.sheetHeight)}
      />
      {error && (
        <p className="map-error glass" role="status">
          {error}
        </p>
      )}
      {map && (
        <>
          {props.position && (
            <UserPosition
              map={map}
              center={props.position}
              accuracy={props.accuracy}
            />
          )}
          {props.highlighted && (
            <RecommendationHighlight map={map} station={props.highlighted} />
          )}
          <MapStationMarkers
            map={map}
            stations={stations}
            onSelect={onSelect}
            corridor={corridor}
          />
        </>
      )}
    </>
  );
}
function MapStationMarkers({
  corridor,
  ...props
}: {
  map: MapLibreMap;
  stations: StationDto[];
  onSelect: (station: StationDto) => void;
  corridor: boolean;
}): ReactElement {
  return corridor ? (
    <CorridorMarkers {...props} />
  ) : (
    <StationMarkers {...props} />
  );
}
