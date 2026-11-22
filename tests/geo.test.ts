import { expect, it } from "vitest";
import {
  boundingBox,
  circleCoordinates,
  gridCellKey,
  haversineKm,
} from "../src/lib/geo";
import { TtlCache } from "../src/lib/ttl-cache";
it("measures known distance and the five kilometre boundary", () => {
  expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
    111.195,
    2,
  );
  expect(
    haversineKm({ lat: 17.385, lng: 78.4867 }, { lat: 17.429, lng: 78.4867 }),
  ).toBeLessThan(5);
  expect(
    haversineKm({ lat: 17.385, lng: 78.4867 }, { lat: 17.431, lng: 78.4867 }),
  ).toBeGreaterThan(5);
  expect(boundingBox(0, 0, 5).north).toBeGreaterThan(0.044);
  expect(boundingBox(90, 180, 5).east).toBe(360);
  expect(gridCellKey(17.385, 78.4867, 5)).toBe("17.4:78.5:5");
});
it("bounds and expires cache entries", () => {
  let now = 0;
  const cache = new TtlCache<number>(1, 10, () => now);
  cache.set("a", 1);
  cache.set("b", 2);
  expect(cache.get("a")).toBeUndefined();
  expect(cache.get("b")).toBe(2);
  now = 10;
  expect(cache.get("b")).toBeUndefined();
  expect(() => new TtlCache(0, 10)).toThrow();
});
it("generates a closed five kilometre ring", () => {
  const center = { lat: 17.385, lng: 78.4867 };
  const ring = circleCoordinates(center);
  expect(ring).toHaveLength(65);
  expect(ring[0]).toEqual(ring[64]);
  for (const [lng = 0, lat = 0] of ring)
    expect(haversineKm(center, { lat, lng })).toBeCloseTo(5, 8);
});
