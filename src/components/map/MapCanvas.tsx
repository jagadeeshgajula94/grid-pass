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
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationDto } from "../../domain/station";
import { boundingBox, routeBounds, type Point } from "../../lib/geo";
import { StationMarkers } from "./StationMarkers";
import { updateRoute } from "./map-layers";
import type { RouteSummaryDto } from "../../domain/route";
import { CorridorMarkers } from "./CorridorMarkers";
interface CanvasProps {
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
function UserPosition({
  map,
  center,
}: {
  map: MapLibreMap;
  center: Point;
}): ReactElement {
  const [element] = useState(() => document.createElement("div"));
  useEffect(() => {
    const marker = new Marker({ element })
      .setLngLat([center.lng, center.lat])
      .addTo(map);
    return (): void => {
      marker.remove();
    };
  }, [map, center, element]);
  return createPortal(
    <div className="user-position" role="img" aria-label="Search center" />,
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
      instance.on("load", () => setError(""));
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
function useMapView(
  map: MapLibreMap | null,
  center: Point,
  light: boolean,
  selected: StationDto | null,
  corridor: boolean,
  route?: RouteSummaryDto,
): void {
  useEffect(() => {
    map?.setStyle(styleUrl(light));
  }, [map, light]);
  useEffect(() => {
    if (!map) return;
    const draw = (): void => updateRoute(map, corridor, center, route);
    map.on("style.load", draw);
    if (map.isStyleLoaded()) draw();
    return (): void => {
      map.off("style.load", draw);
    };
  }, [map, center, corridor, route]);
  useEffect(() => {
    if (map && selected)
      map.flyTo({
        center: [selected.lng, selected.lat],
        zoom: 15,
        offset: window.innerWidth >= 768 ? [190, 0] : [0, -150],
      });
  }, [map, selected, route, corridor]);
}
function useVisibleMap(map: MapLibreMap | null, props: CanvasProps): void {
  const { center, route, corridor, selected, sheetHeight = 150 } = props;
  useEffect(() => {
    if (!map || selected) return;
    const fit = (): void => {
      const desktop = window.innerWidth >= 768;
      const box =
        corridor && route
          ? routeBounds(route.coordinates, 1)
          : boundingBox(center.lat, center.lng, 5);
      const bottom = desktop
        ? 40
        : Math.min(sheetHeight + 24, window.innerHeight * 0.6);
      map.fitBounds(
        [
          [box.west, box.south],
          [box.east, box.north],
        ],
        {
          padding: {
            left: desktop ? 424 : 30,
            right: desktop ? 80 : 30,
            top: desktop ? 80 : 100,
            bottom,
          },
          duration: window.matchMedia?.("(prefers-reduced-motion: reduce)")
            .matches
            ? 0
            : 500,
          maxZoom: corridor ? 13 : 14,
        },
      );
    };
    fit();
    window.addEventListener("resize", fit);
    return (): void => window.removeEventListener("resize", fit);
  }, [map, center, route, corridor, selected, sheetHeight]);
}
export function MapCanvas(props: CanvasProps): ReactElement {
  const {
    center,
    light,
    stations,
    selected,
    onSelect,
    corridor = false,
    route,
  } = props;
  const { container, map, error } = useMap();
  useMapView(map, center, light, selected, corridor, route);
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
          <UserPosition map={map} center={center} />
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
