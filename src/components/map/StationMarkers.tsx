import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import Supercluster, {
  type ClusterFeature as SuperclusterFeature,
  type PointFeature,
} from "supercluster";
import type { StationDto } from "../../domain/station";
import { StationPin } from "./StationPin";
import { cameraMotion } from "./map-layers";
interface PinProperties {
  station: StationDto;
  number: number;
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
    stations.map((station, index) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [station.lng, station.lat] },
      properties: { station, number: index + 1 },
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
  numbered = false,
}: {
  map: MapLibreMap;
  stations: StationDto[];
  onSelect: (station: StationDto) => void;
  numbered?: boolean;
}): ReactElement {
  const index = useMemo(() => clusterIndex(stations), [stations]);
  const entries = useClusterMarkers(map, index);
  return (
    <>
      {entries.map((entry) => {
        return createPortal(
          <MarkerContent
            entry={entry}
            map={map}
            index={index}
            onSelect={onSelect}
            numbered={numbered}
          />,
          entry.element,
          entry.key,
        );
      })}
    </>
  );
}
function MarkerContent({
  entry,
  map,
  index,
  onSelect,
  numbered,
}: {
  entry: MarkerEntry;
  map: MapLibreMap;
  index: Supercluster<PinProperties, Record<string, never>>;
  onSelect: (station: StationDto) => void;
  numbered: boolean;
}): ReactElement {
  const properties = entry.feature.properties;
  if ("cluster" in properties)
    return (
      <button
        className="station-cluster"
        aria-label={`Zoom into ${properties.point_count} ${numbered ? "stops" : "stations"}`}
        onClick={() =>
          map.easeTo({
            ...cameraMotion(),
            center: entry.marker.getLngLat(),
            zoom: index.getClusterExpansionZoom(properties.cluster_id),
          })
        }
      >
        {properties.point_count}
      </button>
    );
  const { station, number } = properties;
  return numbered ? (
    <button
      className="corridor-marker"
      onClick={() => onSelect(station)}
      aria-label={`Stop ${number}: ${station.name}`}
    >
      {number}
    </button>
  ) : (
    <StationPin station={station} onSelect={onSelect} />
  );
}
