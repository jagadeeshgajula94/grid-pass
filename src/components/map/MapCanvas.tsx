import {
  useEffect,
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
function visibleMapPadding(sheetHeight: number): PaddingOptions {
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
function useVisibleMap(map: MapLibreMap | null, props: CanvasProps): void {
  const previous = useRef<OverviewState | null>(null);
  useEffect(() => {
    if (!map) return;
    const current = overviewState(map, props);
    if (needsOverview(previous.current, current)) fitOverview(map, props);
    previous.current = current;
    const resize = (): void => {
      const layout = overviewLayout(props.sheetHeight);
      if (current.layout === layout) return;
      current.layout = layout;
      if (!current.selected && !current.area) fitOverview(map, props);
    };
    window.addEventListener("resize", resize);
    return (): void => window.removeEventListener("resize", resize);
  }, [map, props]);
}
function exposedMapBounds(
  map: MapLibreMap,
  padding: PaddingOptions,
): BoundingBox {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const left = Math.min(padding.left, Math.max(0, width - 1));
  const top = Math.min(padding.top, Math.max(0, height - 1));
  const right = Math.max(left + 1, width - padding.right);
  const bottom = Math.max(top + 1, height - padding.bottom);
  const corners = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
  ].map(([x = 0, y = 0]) => map.unproject([x, y]));
  return {
    west: Math.min(...corners.map((point) => point.lng)),
    east: Math.max(...corners.map((point) => point.lng)),
    south: Math.min(...corners.map((point) => point.lat)),
    north: Math.max(...corners.map((point) => point.lat)),
  };
}
function useMapAreaEvents(map: MapLibreMap | null, props: CanvasProps): void {
  const userMove = useRef(false);
  const { onArea, corridor, fitRequest, selected, sheetHeight = 150 } = props;
  useEffect(() => {
    userMove.current = false;
    if (!map) return;
    const start = (event: { originalEvent?: unknown } = {}): void => {
      userMove.current = !!event.originalEvent;
    };
    const finish = (event: { originalEvent?: unknown } = {}): void => {
      const user = userMove.current || !!event.originalEvent;
      userMove.current = false;
      if (!user || corridor || !onArea) return;
      onArea(exposedMapBounds(map, visibleMapPadding(sheetHeight)));
    };
    map.on("movestart", start);
    map.on("moveend", finish);
    return (): void => {
      map.off("movestart", start);
      map.off("moveend", finish);
    };
  }, [map, onArea, corridor, fitRequest, selected, sheetHeight]);
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
