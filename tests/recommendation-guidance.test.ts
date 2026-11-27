import { afterEach, expect, it, vi } from "vitest";
import {
  recommendCharging,
  rankRecommendations,
} from "../src/services/recommendation.service";
import * as routes from "../src/services/route.service";
import { corridorFixture, destination } from "./planner-ui-fixtures";
import { assistantCenter } from "./recommendation-fixtures";
import { candidate, mockDesignPack, rangeQuery } from "./range-fixtures";
import { recommendationSchema } from "../src/validation/recommendation.schema";
import { estimateRange } from "../src/services/range.service";
const routeContext = {
  mode: "route" as const,
  origin: assistantCenter,
  destination: { lat: destination.lat, lng: destination.lng },
  destinationName: "Vijayawada",
  bufferKm: 5,
};
function mockRoute(distance: number, empty = false, fallback = false): void {
  vi.spyOn(routes, "findCorridor").mockResolvedValue({
    ...corridorFixture,
    route: {
      ...corridorFixture.route,
      totalDistanceKm: distance,
      estimatedDurationMin: distance,
      coordinates: [assistantCenter, destination],
      fallback,
    },
    stations: empty
      ? []
      : [{ ...candidate().station, kmAlongRoute: 2, detourKm: 0.5 }],
  });
}
afterEach(() => vi.restoreAllMocks());
it("gives a reachable destination with Tier B optional stops no urgent charging advice", async () => {
  mockDesignPack();
  mockRoute(10);
  const corridor = await routes.findCorridor({
    origin: assistantCenter,
    destination,
    bufferKm: 5,
  });
  vi.mocked(routes.findCorridor).mockResolvedValue({
    ...corridor,
    stations: [{ ...candidate().station, kmAlongRoute: 8, detourKm: 8 }],
  });
  const result = await recommendCharging({
    ...rangeQuery(15),
    context: routeContext,
  });
  expect(result.tier).toBe("B");
  expect(result.recommendations).toHaveLength(1);
  expect(result.recommendations[0]?.arrivalPercent).toBeLessThan(10);
  expect(result.routeMessage).toContain("optional stops below");
  expect(result.message).toContain("optional");
  expect(JSON.stringify(result)).not.toMatch(/go now|drive gently/);
});
it("P3: 90% Nexon 45, 150 km at 60 km/h, arrives at 40.5% and stops are optional", async () => {
  mockDesignPack();
  mockRoute(150);
  const result = await recommendCharging({
    ...rangeQuery(90),
    context: routeContext,
  });
  expect(result.routeMessage).toBe(
    "Reach Vijayawada with ~40% left; optional stops below",
  );
  expect(result.consumptionWhPerKm).toBeCloseTo(148.5);
});
it("P4: 60% Nexon 45 needs charging on a 321 km trip", async () => {
  mockDesignPack();
  mockRoute(321);
  const result = await recommendCharging({
    ...rangeQuery(60),
    context: routeContext,
  });
  expect(result.routeMessage).toBe(
    "Vijayawada is ~321 km, you have ~152 km with reserve: charge at one of these",
  );
});
it("N6-route: at 15% a 300 km route with no reachable stop never offers nonexistent stops", async () => {
  mockRoute(300, true);
  const result = await recommendCharging({
    ...rangeQuery(15),
    context: routeContext,
  });
  expect(result.recommendations).toEqual([]);
  expect(result.routeMessage).toBe(
    "No reachable stop on this route; charge before leaving or call assistance.",
  );
  expect(result.routeMessage).not.toContain("these");
});
it("P3b: an empty station region never hides a reachable destination", async () => {
  mockDesignPack();
  mockRoute(150, true);
  const result = await recommendCharging({
    ...rangeQuery(90),
    context: routeContext,
  });
  expect(result.routeMessage).toBe(
    "Reach Vijayawada with ~40% left; no charging stop needed",
  );
  expect(result.message).not.toContain("assistance");
});
it("P3b also replaces roadside advice when all stations, but not the destination, are beyond reach", async () => {
  mockDesignPack();
  mockRoute(150);
  const route = await routes.findCorridor({
    origin: assistantCenter,
    destination,
    bufferKm: 5,
  });
  vi.mocked(routes.findCorridor).mockResolvedValue({
    ...route,
    stations: [{ ...candidate().station, kmAlongRoute: 500, detourKm: 0 }],
  });
  const result = await recommendCharging({
    ...rangeQuery(90),
    context: routeContext,
  });
  expect(result.recommendations).toEqual([]);
  expect(result.routeMessage).toContain("no charging stop needed");
  expect(result.message).not.toContain("assistance");
});
it("uses the exact 10% destination threshold and the fallback road factor", async () => {
  const pack = mockDesignPack();
  const boundary = estimateRange(pack, 60, 60).comfortableRangeKm;
  mockRoute(boundary - 1e-9);
  expect(
    (await recommendCharging({ ...rangeQuery(60), context: routeContext }))
      .routeMessage,
  ).toContain("optional stops");
  mockRoute(boundary + 0.001);
  expect(
    (await recommendCharging({ ...rangeQuery(60), context: routeContext }))
      .routeMessage,
  ).toContain("charge at one");
  mockRoute(200, false, true);
  const result = await recommendCharging({
    ...rangeQuery(60),
    context: routeContext,
  });
  expect(result.routeMessage).toContain("~260 km");
  expect(result.approximateRoadDistances).toBe(true);
});
it("keeps Bachupally ahead of Pragathi Nagar chiefly for detour, and independently rewards progress", () => {
  const pragathi = {
    ...candidate("pragathi", 2.7286),
    detourKm: 2.7286,
    progressKm: 0,
  };
  const bachupally = {
    ...candidate("bachupally", 4.4506),
    detourKm: 0.3142,
    progressKm: 4.1363,
  };
  const query = { ...rangeQuery(60), context: routeContext };
  const ids = (entries: (typeof pragathi)[]) =>
    rankRecommendations(entries, query).recommendations.map(
      (stop) => stop.station.id,
    );
  expect(ids([pragathi, bachupally])).toEqual(["bachupally", "pragathi"]);
  expect(ids([pragathi, { ...bachupally, progressKm: 0 }])).toEqual([
    "bachupally",
    "pragathi",
  ]);
  expect(
    ids([
      pragathi,
      { ...bachupally, detourKm: pragathi.detourKm, progressKm: 0 },
    ]),
  ).toEqual(["pragathi", "bachupally"]);
  expect(
    ids([pragathi, { ...bachupally, detourKm: pragathi.detourKm }]),
  ).toEqual(["bachupally", "pragathi"]);
});
it("bounds destination labels, supports neutral names, and propagates upstream failures safely", async () => {
  const query = { ...rangeQuery(), context: routeContext };
  expect(
    recommendationSchema.parse({
      ...query,
      context: { ...routeContext, destinationName: `  ${"V".repeat(200)}  ` },
    }).context,
  ).toMatchObject({ destinationName: "V".repeat(160) });
  for (const destinationName of [" ", 1])
    expect(
      recommendationSchema.safeParse({
        ...query,
        context: { ...routeContext, destinationName },
      }).success,
    ).toBe(false);
  mockRoute(300);
  expect(
    (
      await recommendCharging({
        ...query,
        context: { ...routeContext, destinationName: undefined },
      })
    ).routeMessage,
  ).toContain("Your destination");
  vi.mocked(routes.findCorridor).mockRejectedValue(
    new Error("routing unavailable"),
  );
  await expect(recommendCharging(query)).rejects.toThrow("routing unavailable");
});
