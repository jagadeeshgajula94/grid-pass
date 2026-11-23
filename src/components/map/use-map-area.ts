import { useCallback, useEffect, useState } from "react";
import { haversineKm, type BoundingBox, type Point } from "../../lib/geo";

export interface MapArea {
  center: Point;
  radiusKm: number;
}
interface AreaState {
  area: MapArea | null;
  onArea: (bounds: BoundingBox) => void;
  reset: () => void;
}
export function boundsToArea({
  south,
  north,
  west,
  east,
}: BoundingBox): MapArea {
  const span = east < west ? east + 360 - west : east - west;
  const lat = Math.max(-90, Math.min(90, (south + north) / 2));
  const lng = ((((west + span / 2 + 180) % 360) + 360) % 360) - 180;
  const width =
    span >= 180
      ? Infinity
      : haversineKm({ lat, lng: west }, { lat, lng: west + span });
  const height = haversineKm({ lat: south, lng }, { lat: north, lng });
  return {
    center: {
      lat: Math.round(lat * 10_000) / 10_000,
      lng: Math.round(lng * 10_000) / 10_000,
    },
    radiusKm:
      Math.round(Math.max(1, Math.min(50, Math.min(width, height) / 2)) * 10) /
      10,
  };
}
export function useMapArea(enabled: boolean): AreaState {
  const [area, setArea] = useState<MapArea | null>(null);
  const reset = useCallback((): void => setArea(null), []);
  const onArea = useCallback(
    (bounds: BoundingBox): void => {
      if (enabled) setArea(boundsToArea(bounds));
    },
    [enabled],
  );
  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);
  return { area, onArea, reset };
}
