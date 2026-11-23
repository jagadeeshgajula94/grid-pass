import type { AnimationOptions, Map as MapLibreMap } from "maplibre-gl";
import {
  boundingBox,
  circleCoordinates,
  routeBounds,
  type Point,
} from "../../lib/geo";
import type { RouteSummaryDto } from "../../domain/route";
const OUTLINE_LAYER = "radius-outline";
const FILL_LAYER = "radius-fill";
export function cameraMotion(): Pick<
  AnimationOptions,
  "duration" | "easing" | "essential"
> {
  return {
    duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 750,
    easing: (time): number => 1 - (1 - time) ** 3,
    essential: false,
  };
}
function removeLayers(
  map: MapLibreMap,
  source: string,
  layers: string[],
): void {
  for (const layer of layers) if (map.getLayer(layer)) map.removeLayer(layer);
  if (map.getSource(source)) map.removeSource(source);
}
export function updateRoute(
  map: MapLibreMap,
  corridor: boolean,
  center: Point,
  route?: RouteSummaryDto,
  options: { radiusKm?: number; area?: boolean } = {},
): void {
  removeLayers(map, "route", ["route-line", "route-casing"]);
  if (!corridor) {
    if (options.area) removeLayers(map, "radius", [OUTLINE_LAYER, FILL_LAYER]);
    else updateRing(map, center, options.radiusKm);
    return;
  }
  removeLayers(map, "radius", [OUTLINE_LAYER, FILL_LAYER]);
  if (!route) return;
  map.addSource("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route.coordinates.map((point) => [point.lng, point.lat]),
      },
    },
  });
  for (const [id, color, width] of [
    ["route-casing", "#0b0f17", 9],
    ["route-line", "#10b981", 4],
  ] as const) {
    map.addLayer({
      id,
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": color, "line-width": width },
    });
  }
}
export function fitRoute(map: MapLibreMap, route: RouteSummaryDto): void {
  const box = routeBounds(route.coordinates, 1);
  map.fitBounds(
    [
      [box.west, box.south],
      [box.east, box.north],
    ],
    {
      padding:
        window.innerWidth >= 768
          ? {
              left: 370,
              right: 70,
              top: Math.min(410, window.innerHeight * 0.5),
              bottom: 70,
            }
          : {
              left: 30,
              right: 30,
              top: window.innerHeight * 0.42,
              bottom: window.innerHeight * 0.25,
            },
      ...cameraMotion(),
      maxZoom: 13,
    },
  );
}
export function updateRing(
  map: MapLibreMap,
  center: Point,
  radiusKm = 5,
): void {
  if (map.getLayer(OUTLINE_LAYER)) map.removeLayer(OUTLINE_LAYER);
  if (map.getLayer(FILL_LAYER)) map.removeLayer(FILL_LAYER);
  if (map.getSource("radius")) map.removeSource("radius");
  map.addSource("radius", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [circleCoordinates(center, radiusKm)],
      },
    },
  });
  map.addLayer({
    id: FILL_LAYER,
    type: "fill",
    source: "radius",
    paint: { "fill-color": "#10b981", "fill-opacity": 0.07 },
  });
  map.addLayer({
    id: OUTLINE_LAYER,
    type: "line",
    source: "radius",
    paint: {
      "line-color": "#10b981",
      "line-width": 1.5,
      "line-opacity": 0.65,
      "line-dasharray": [3, 3],
    },
  });
}
export function updateAccuracy(
  map: MapLibreMap,
  position?: Point | null,
  accuracy?: number | null,
): void {
  const source = "location-accuracy";
  removeLayers(map, source, ["accuracy-outline", "accuracy-fill"]);
  if (!position || accuracy == null) return;
  map.addSource(source, {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [circleCoordinates(position, accuracy / 1000)],
      },
    },
  });
  map.addLayer({
    id: "accuracy-fill",
    source,
    type: "fill",
    paint: { "fill-color": "#3b82f6", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "accuracy-outline",
    source,
    type: "line",
    paint: { "line-color": "#3b82f6", "line-opacity": 0.5, "line-width": 1 },
  });
}
export function fitCenter(map: MapLibreMap, center: Point): void {
  const box = boundingBox(center.lat, center.lng, 5);
  map.fitBounds(
    [
      [box.west, box.south],
      [box.east, box.north],
    ],
    {
      padding:
        window.innerWidth >= 768
          ? { left: 370, right: 80, top: 310, bottom: 60 }
          : { left: 25, right: 25, top: 350, bottom: 150 },
      ...cameraMotion(),
      maxZoom: 14,
    },
  );
}
