import { expect, it } from "vitest";
import {
  collisionGroups,
  collisionExpansionZoom,
  type ClusterFeature,
} from "../src/components/map/marker-collisions";
import { STATION_SEED } from "../src/db/station-seed";

function feature(x: number, y: number, id = 0): ClusterFeature {
  const station = STATION_SEED[0];
  if (!station) throw new Error("Missing station seed");
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [x, y] },
    properties: { station: { ...station, id: String(id) }, number: id + 1 },
  };
}
const project = ([x, y]: [number, number]): { x: number; y: number } => ({
  x,
  y,
});
it("merges full-width labels that Supercluster's circular radius can miss", () => {
  expect(
    collisionGroups([feature(0, 0), feature(150, 0, 1)], project, false),
  ).toMatchObject([{ count: 2 }]);
  expect(
    collisionGroups([feature(0, 0), feature(210, 0, 1)], project, false),
  ).toHaveLength(2);
  expect(
    collisionGroups([feature(0, 0), feature(0, 70, 1)], project, false),
  ).toHaveLength(2);
  expect(
    collisionGroups([feature(0, 0), feature(80, 0, 1)], project, true),
  ).toHaveLength(2);
  expect(collisionGroups([], project, false)).toEqual([]);
});
it("rechecks merged bubbles and leaves no colliding pair in dense layouts", () => {
  const features = Array.from({ length: 150 }, (_, index) =>
    feature((index % 15) * 55, Math.floor(index / 15) * 35, index),
  );
  const groups = collisionGroups(features, project, false);
  expect(groups.reduce((sum, group) => sum + group.count, 0)).toBe(
    features.length,
  );
  for (const [index, group] of groups.entries()) {
    for (const other of groups.slice(index + 1)) {
      const width =
        ((group.count > 1 ? 64 : 200) + (other.count > 1 ? 64 : 200)) / 2;
      expect(
        Math.abs(group.coordinates[0] - other.coordinates[0]) >= width ||
          Math.abs(group.coordinates[1] - other.coordinates[1]) >= 64,
      ).toBe(true);
    }
  }
});
it("preserves upstream cluster counts and wraps dateline group centers", () => {
  const cluster: ClusterFeature = {
    type: "Feature",
    id: 10,
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: {
      cluster: true,
      cluster_id: 10,
      point_count: 5,
      point_count_abbreviated: 5,
    },
  };
  const merged = collisionGroups([cluster, feature(100, 0)], project, false);
  expect(merged[0]?.count).toBe(6);
  expect(merged[0]?.coordinates[0]).toBeCloseTo(100 / 6);
  const wrapped = collisionGroups(
    [feature(179.9, 0), feature(-179.9, 0, 1)],
    ([lng, lat]) => ({ x: lng < 0 ? lng + 360 : lng, y: lat }),
    false,
  );
  expect(wrapped).toHaveLength(1);
  expect(Math.abs(wrapped[0]?.coordinates[0] ?? 0)).toBeCloseTo(180);
});
it("zooms enough to clear labels and caps coincident points at the map limit", () => {
  const options = { zoom: 17, maxZoom: 22, minimum: 18, numbered: false };
  const zoom = collisionExpansionZoom(
    [
      [0, 0],
      [10, 0],
    ],
    project,
    options,
  );
  expect(10 * 2 ** (zoom - options.zoom)).toBeGreaterThan(200);
  expect(
    collisionExpansionZoom(
      [
        [0, 0],
        [0, 0],
      ],
      project,
      options,
    ),
  ).toBe(22);
  expect(collisionExpansionZoom([], project, { ...options, minimum: 20 })).toBe(
    20,
  );
  expect(
    collisionExpansionZoom(
      [
        [0, 0],
        [10, 0],
      ],
      project,
      { ...options, numbered: true },
    ),
  ).toBeLessThan(zoom);
});
it("expands a dense cluster incrementally instead of zooming past all its distant members", () => {
  const options = { zoom: 12, maxZoom: 22, minimum: 13, numbered: false };
  const zoom = collisionExpansionZoom(
    [
      [0, 0],
      [0.001, 0],
      [150, 0],
    ],
    project,
    options,
  );
  expect(zoom).toBeLessThan(14);
  expect(zoom).toBeGreaterThan(13);
});
