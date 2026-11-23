import { afterEach, expect, it, vi } from "vitest";
import {
  recommendCharging,
  rankRecommendations,
} from "../src/services/recommendation.service";
import * as routes from "../src/services/route.service";
import {
  corridorFixture,
  destination,
  plannerStation,
} from "./planner-ui-fixtures";
import { assistantCenter, NEXON } from "./recommendation-fixtures";
import type { RecommendationRequest } from "../src/domain/recommendation";
import type { EvModel } from "../src/domain/ev-models";
import { recommendationSchema } from "../src/validation/recommendation.schema";

const query = {
  evModel: NEXON,
  batteryPercent: 60,
  context: {
    mode: "route",
    origin: assistantCenter,
    destination: { lat: destination.lat, lng: destination.lng },
    destinationName: destination.name,
    bufferKm: 5,
  },
} satisfies RecommendationRequest & { evModel: EvModel };
const leaving = "Charge to 80% at one of these before leaving";
function mockRoute(
  distance = 275,
  fallback = false,
  stations = [{ ...plannerStation, kmAlongRoute: 2, detourKm: 0.5 }],
): void {
  vi.spyOn(routes, "findCorridor").mockResolvedValue({
    ...corridorFixture,
    route: { ...corridorFixture.route, totalDistanceKm: distance, fallback },
    stations,
  });
}
afterEach(() => vi.restoreAllMocks());
it("explains why a long trip needs an early charge, without promising 80% will finish the trip", async () => {
  mockRoute();
  const result = await recommendCharging(query);
  expect(result.routeMessage).toContain(
    "Vijayawada is ~275 km away and you have ~209 km with reserve",
  );
  expect(result.routeMessage).toContain(leaving);
  expect(result.routeMessage).toContain("further stops may be needed");
});
it("labels reachable destinations and their unrounded arrival reserve as optional charging", async () => {
  mockRoute(100);
  expect((await recommendCharging(query)).routeMessage).toBe(
    "You can reach Vijayawada with ~36% left (10% reserve); optional stops below.",
  );
});
it.each([0, 0.00001])(
  "uses the exact 10%% destination reserve boundary (extra=%s km)",
  async (extra) => {
    mockRoute(465 * 0.9 * 0.5 + extra);
    const result = await recommendCharging(query);
    expect(result.routeMessage?.includes("optional stops below")).toBe(
      extra === 0,
    );
  },
);
it("applies the same conservative road factor to fallback destination and charger distances", async () => {
  mockRoute(200, true);
  const result = await recommendCharging(query);
  expect(result.routeMessage).toContain("~260 km away");
  expect(result.routeMessage).toContain(leaving);
  expect(result.approximateRoadDistances).toBe(true);
});
it.each([100, 275])(
  "does not refer to nonexistent stops when the corridor is empty (%s km)",
  async (distance) => {
    mockRoute(distance, false, []);
    const result = await recommendCharging(query);
    expect(result.recommendations).toEqual([]);
    expect(result.routeMessage).not.toMatch(/one of these|stops below/);
    expect(result.routeMessage).toContain(
      distance === 100
        ? "no charging stop is needed"
        : "No reachable charging stop was found",
    );
  },
);
it("does not tell drivers to charge before leaving when viable stops are farther along the route", async () => {
  mockRoute(275, false, [
    { ...plannerStation, kmAlongRoute: 100, detourKm: 1 },
  ]);
  expect((await recommendCharging(query)).routeMessage).toContain(
    "stops en route",
  );
});
it("uses a neutral destination label for older callers, bounds names, and propagates service errors", async () => {
  mockRoute();
  expect(
    (
      await recommendCharging({
        ...query,
        context: { ...query.context, destinationName: undefined },
      })
    ).routeMessage,
  ).toContain("Your destination");
  for (const destinationName of [" ", "x".repeat(161), 1])
    expect(
      recommendationSchema.safeParse({
        ...query,
        context: { ...query.context, destinationName },
      }).success,
    ).toBe(false);
  vi.mocked(routes.findCorridor).mockRejectedValue(
    new Error("routing unavailable"),
  );
  await expect(recommendCharging(query)).rejects.toThrow("routing unavailable");
});
it("ranks Bachupally above closer Pragathi Nagar chiefly for its smaller round-trip detour, with a progress bonus", () => {
  const station = (id: string) => ({ ...plannerStation, id });
  const pragathi = {
    station: station("pragathi"),
    roadDistanceKm: 2.728558799713669,
    detourKm: 2.728558799713669,
    progressKm: 0,
  };
  const bachupally = {
    station: station("bachupally"),
    roadDistanceKm: 4.450565210122713,
    detourKm: 0.3142355917911618,
    progressKm: 4.136329618331551,
  };
  const ids = (candidates: (typeof pragathi)[]) =>
    rankRecommendations(candidates, query).recommendations.map(
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
