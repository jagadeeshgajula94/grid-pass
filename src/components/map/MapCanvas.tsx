import { useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationDto } from "../../domain/station";
import type { Point } from "../../lib/geo";
import { StationMarkers } from "./StationMarkers";
import { fitCenter, fitRoute, updateRoute } from "./map-layers";
import type { RouteSummaryDto } from "../../domain/route";
import { CorridorMarkers } from "./CorridorMarkers";
interface CanvasProps {
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
        attributionControl: {},
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
    if (!corridor) fitCenter(map, center);
    return (): void => {
      map.off("style.load", draw);
    };
  }, [map, center, corridor, route]);
  useEffect(() => {
    if (map && selected)
      map.flyTo({
        center: [selected.lng, selected.lat],
        zoom: 15,
        offset: [-100, 0],
      });
    else if (map && route && corridor) fitRoute(map, route);
  }, [map, selected, route, corridor]);
}
export function MapCanvas({
  center,
  light,
  stations,
  selected,
  onSelect,
  corridor = false,
  route,
}: CanvasProps): ReactElement {
  const { container, map, error } = useMap();
  useMapView(map, center, light, selected, corridor, route);
  return (
    <>
      <div
        className="map-canvas"
        ref={container}
        aria-label="Charging stations map"
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
