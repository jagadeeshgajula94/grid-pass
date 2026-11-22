import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import Supercluster, {
  type ClusterFeature as SuperclusterFeature,
  type PointFeature,
} from "supercluster";
import type { StationDto } from "../../domain/station";
import { StationPin } from "./StationPin";
interface PinProperties {
  station: StationDto;
}
type ClusterFeature =
  SuperclusterFeature<Record<string, never>> | PointFeature<PinProperties>;
interface MarkerEntry {
  key: string;
  marker: Marker;
  element: HTMLDivElement;
  feature: ClusterFeature;
}
function clusterIndex(
  stations: StationDto[],
): Supercluster<PinProperties, Record<string, never>> {
  return new Supercluster<PinProperties, Record<string, never>>({
    radius: 80,
    maxZoom: 16,
  }).load(
    stations.map((station) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [station.lng, station.lat] },
      properties: { station },
    })),
  );
}
function useClusterMarkers(
  map: MapLibreMap,
  index: Supercluster<PinProperties, Record<string, never>>,
): MarkerEntry[] {
  const [entries, setEntries] = useState<MarkerEntry[]>([]);
  useEffect(() => {
    const active = new Map<string, MarkerEntry>();
    const update = (): void => {
      const bounds = map.getBounds();
      const features = index.getClusters(
        [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ],
        Math.floor(map.getZoom()),
      );
      syncMarkers(map, active, features);
      setEntries([...active.values()]);
    };
    update();
    map.on("moveend", update);
    return (): void => {
      map.off("moveend", update);
      for (const entry of active.values()) entry.marker.remove();
    };
  }, [map, index]);
  return entries;
}
function syncMarkers(
  map: MapLibreMap,
  active: Map<string, MarkerEntry>,
  features: ClusterFeature[],
): void {
  const keys = new Set<string>();
  for (const feature of features) {
    const key =
      "cluster" in feature.properties
        ? `cluster-${feature.id}`
        : `station-${feature.properties.station.id}`;
    keys.add(key);
    let entry = active.get(key);
    if (!entry) {
      const element = document.createElement("div");
      const [lng = 0, lat = 0] = feature.geometry.coordinates;
      entry = {
        key,
        element,
        feature,
        marker: new Marker({ element }).setLngLat([lng, lat]).addTo(map),
      };
      active.set(key, entry);
    }
    entry.feature = feature;
  }
  for (const [key, entry] of active)
    if (!keys.has(key)) {
      entry.marker.remove();
      active.delete(key);
    }
}
export function StationMarkers({
  map,
  stations,
  onSelect,
}: {
  map: MapLibreMap;
  stations: StationDto[];
  onSelect: (station: StationDto) => void;
}): ReactElement {
  const index = useMemo(() => clusterIndex(stations), [stations]);
  const entries = useClusterMarkers(map, index);
  return (
    <>
      {entries.map((entry) => {
        const properties = entry.feature.properties;
        if ("cluster" in properties)
          return createPortal(
            <button
              className="station-cluster"
              aria-label={`Zoom into ${properties.point_count} stations`}
              onClick={() =>
                map.easeTo({
                  center: entry.marker.getLngLat(),
                  zoom: index.getClusterExpansionZoom(properties.cluster_id),
                })
              }
            >
              {properties.point_count}
            </button>,
            entry.element,
            entry.key,
          );
        return createPortal(
          <StationPin station={properties.station} onSelect={onSelect} />,
          entry.element,
          entry.key,
        );
      })}
    </>
  );
}
