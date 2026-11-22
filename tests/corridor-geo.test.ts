import { expect, it } from "vitest";
import {
  greatCircleLine,
  haversineKm,
  pointToSegmentKm,
  polylineLengthKm,
  projectOntoPolyline,
  routeBounds,
} from "../src/lib/geo";
const start = { lat: 0, lng: 0 };
const end = { lat: 0, lng: 2 };
it("projects accurately inside and beyond a segment", () => {
  expect(pointToSegmentKm({ lat: 1, lng: 1 }, start, end)).toBeCloseTo(
    111.195,
    2,
  );
  expect(pointToSegmentKm({ lat: 0, lng: 3 }, start, end)).toBeCloseTo(
    111.195,
    2,
  );
  expect(pointToSegmentKm(start, start, start)).toBe(0);
  expect(projectOntoPolyline(start, []).distanceKm).toBe(Infinity);
});
it("orders by accumulated polyline distance and expands bounds", () => {
  const coordinates = [start, end, { lat: 1, lng: 2 }];
  expect(
    projectOntoPolyline({ lat: 0.5, lng: 2 }, coordinates).kmAlongRoute,
  ).toBeCloseTo(277.988, 2);
  expect(polylineLengthKm(coordinates)).toBeCloseTo(333.585, 2);
  expect(polylineLengthKm([])).toBe(0);
  expect(routeBounds(coordinates, 5).south).toBeLessThan(0);
});
it("densifies great-circle geometry to five kilometre steps", () => {
  const coordinates = greatCircleLine(
    { lat: 17.385, lng: 78.4867 },
    { lat: 16.5062, lng: 80.648 },
  );
  expect(coordinates.length).toBeGreaterThan(40);
  expect(
    coordinates.every(
      (point, index) =>
        !index ||
        haversineKm(coordinates.at(index - 1) ?? point, point) <= 5.001,
    ),
  ).toBe(true);
  expect(greatCircleLine(start, start)).toEqual([start, start]);
});
