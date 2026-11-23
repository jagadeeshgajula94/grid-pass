import type {
  ClusterFeature as SuperclusterFeature,
  PointFeature,
} from "supercluster";
import type { StationDto } from "../../domain/station";

export interface PinProperties {
  station: StationDto;
  number: number;
}
export type ClusterFeature =
  SuperclusterFeature<unknown> | PointFeature<PinProperties>;
type Coordinates = [number, number];
type Project = (coordinates: Coordinates) => { x: number; y: number };
export interface MarkerGroup {
  key: string;
  coordinates: Coordinates;
  features: ClusterFeature[];
  count: number;
}
const BUBBLE_SIZE = 64;
const PIN_WIDTH = 200;
function featureGroup(feature: ClusterFeature): MarkerGroup {
  const [lng = 0, lat = 0] = feature.geometry.coordinates;
  const properties = feature.properties;
  return {
    key:
      "cluster" in properties
        ? `cluster-${properties.cluster_id}`
        : `station-${properties.station.id}`,
    coordinates: [lng, lat],
    features: [feature],
    count: "cluster" in properties ? properties.point_count : 1,
  };
}
function mergeGroups(left: MarkerGroup, right: MarkerGroup): MarkerGroup {
  const count = left.count + right.count;
  const weight = right.count / count;
  const longitudeDelta =
    ((right.coordinates[0] - left.coordinates[0] + 540) % 360) - 180;
  const features = [...left.features, ...right.features];
  return {
    key: features
      .map((feature) => featureGroup(feature).key)
      .sort()
      .join("|"),
    features,
    count,
    coordinates: [
      left.coordinates[0] + longitudeDelta * weight,
      left.coordinates[1] +
        (right.coordinates[1] - left.coordinates[1]) * weight,
    ],
  };
}
function overlaps(
  left: MarkerGroup,
  right: MarkerGroup,
  project: Project,
  numbered: boolean,
): boolean {
  const first = project(left.coordinates);
  const second = project(right.coordinates);
  const width = (group: MarkerGroup): number =>
    numbered || group.count > 1 ? BUBBLE_SIZE : PIN_WIDTH;
  return (
    Math.abs(first.x - second.x) < (width(left) + width(right)) / 2 &&
    Math.abs(first.y - second.y) < BUBBLE_SIZE
  );
}
export function collisionGroups(
  features: ClusterFeature[],
  project: Project,
  numbered: boolean,
): MarkerGroup[] {
  const groups: MarkerGroup[] = [];
  const pixels = new Map<Coordinates, ReturnType<Project>>();
  const cachedProject: Project = (coordinates) => {
    const point = pixels.get(coordinates) ?? project(coordinates);
    pixels.set(coordinates, point);
    return point;
  };
  for (const feature of features) {
    let group = featureGroup(feature);
    let collision = groups.findIndex((other) =>
      overlaps(group, other, cachedProject, numbered),
    );
    while (collision >= 0) {
      const other = groups.splice(collision, 1)[0];
      if (other) group = mergeGroups(group, other);
      collision = groups.findIndex((candidate) =>
        overlaps(group, candidate, cachedProject, numbered),
      );
    }
    groups.push(group);
  }
  return groups;
}
export function collisionExpansionZoom(
  points: Coordinates[],
  project: Project,
  options: {
    zoom: number;
    maxZoom: number;
    minimum: number;
    numbered: boolean;
  },
): number {
  const projected = points.map(project);
  let scale = projected.length > 1 ? Infinity : 2;
  for (const [index, point] of projected.entries()) {
    for (const other of projected.slice(index + 1)) {
      scale = Math.min(
        scale,
        Math.min(
          (options.numbered ? BUBBLE_SIZE : PIN_WIDTH) /
            Math.abs(point.x - other.x),
          BUBBLE_SIZE / Math.abs(point.y - other.y),
        ),
      );
    }
  }
  return Math.min(
    options.maxZoom,
    Math.max(
      options.minimum,
      options.zoom + Math.log2(Math.max(2, scale)) + 0.1,
    ),
  );
}
