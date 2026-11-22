import type { Map as MapLibreMap } from "maplibre-gl";
import { boundingBox, circleCoordinates, type Point } from "../../lib/geo";
const OUTLINE_LAYER = "radius-outline";
const FILL_LAYER = "radius-fill";
export function updateRing(map: MapLibreMap, center: Point): void {
  if (map.getLayer(OUTLINE_LAYER)) map.removeLayer(OUTLINE_LAYER);
  if (map.getLayer(FILL_LAYER)) map.removeLayer(FILL_LAYER);
  if (map.getSource("radius")) map.removeSource("radius");
  map.addSource("radius", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [circleCoordinates(center)] },
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
          ? { left: 370, right: 80, top: 220, bottom: 60 }
          : { left: 25, right: 25, top: 245, bottom: 150 },
      duration: 1000,
      maxZoom: 14,
    },
  );
}
