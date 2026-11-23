import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import Supercluster from "supercluster";
import type { StationDto } from "../../domain/station";
import { StationPin } from "./StationPin";
import { cameraMotion } from "./map-layers";
import {
  collisionGroups,
  collisionExpansionZoom,
  type PinProperties,
  type MarkerGroup,
} from "./marker-collisions";
interface MarkerEntry {
  key: string;
  marker: Marker;
  element: HTMLDivElement;
  group: MarkerGroup;
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
  numbered: boolean,
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
      syncMarkers(
        map,
        active,
        collisionGroups(
          features,
          (point) => projectMarker(map, point),
          numbered,
        ),
      );
      setEntries([...active.values()]);
    };
    update();
    map.on("moveend", update);
    map.on("move", update);
    map.on("resize", update);
    return (): void => {
      map.off("moveend", update);
      map.off("move", update);
      map.off("resize", update);
      for (const entry of active.values()) entry.marker.remove();
    };
  }, [map, index, numbered]);
  return entries;
}
function syncMarkers(
  map: MapLibreMap,
  active: Map<string, MarkerEntry>,
  groups: MarkerGroup[],
): void {
  const keys = new Set<string>();
  for (const group of groups) {
    const key = group.key;
    keys.add(key);
    let entry = active.get(key);
    if (!entry) {
      const element = document.createElement("div");
      element.className = "station-marker";
      entry = {
        key,
        element,
        group,
        marker: new Marker({ element }).setLngLat(group.coordinates).addTo(map),
      };
      active.set(key, entry);
    }
    entry.group = group;
    entry.marker.setLngLat(group.coordinates);
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
  const entries = useClusterMarkers(map, index, numbered);
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
  const group = entry.group;
  if (group.count > 1)
    return (
      <button
        className="station-cluster"
        aria-label={`Zoom into ${group.count} ${numbered ? "stops" : "stations"}`}
        onClick={() =>
          map.easeTo({
            ...cameraMotion(),
            center: entry.marker.getLngLat(),
            zoom: expansionZoom(map, index, group, numbered),
          })
        }
      >
        {group.count}
      </button>
    );
  const feature = group.features[0];
  if (!feature || "cluster" in feature.properties) return <></>;
  const { station, number } = feature.properties;
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
function expansionZoom(
  map: MapLibreMap,
  index: Supercluster<PinProperties, Record<string, never>>,
  group: MarkerGroup,
  numbered: boolean,
): number {
  let minimum = map.getZoom() + 1;
  const leaves = group.features.flatMap((feature) => {
    if (!("cluster" in feature.properties)) return [feature];
    if (group.features.length === 1)
      minimum = Math.max(
        minimum,
        index.getClusterExpansionZoom(feature.properties.cluster_id),
      );
    return index.getLeaves(feature.properties.cluster_id, Infinity);
  });
  const points: [number, number][] = leaves.map((leaf) => {
    const [lng = 0, lat = 0] = leaf.geometry.coordinates;
    return [lng, lat];
  });
  return collisionExpansionZoom(points, (point) => projectMarker(map, point), {
    zoom: map.getZoom(),
    maxZoom: map.getMaxZoom(),
    minimum,
    numbered,
  });
}
function projectMarker(
  map: MapLibreMap,
  [lng, lat]: [number, number],
): { x: number; y: number } {
  const wrapped = lng + Math.round((map.getCenter().lng - lng) / 360) * 360;
  return map.project([wrapped, lat]);
}
