import { afterEach, expect, it, vi } from "vitest";
import { EV_MODELS, EV_SPECS } from "../src/domain/ev-models";
import {
  rankRecommendations,
  recommendCharging,
  type RecommendationCandidate,
} from "../src/services/recommendation.service";
import * as stations from "../src/services/station.service";
import * as routes from "../src/services/route.service";
import { haversineKm } from "../src/lib/geo";
import { corridorFixture, plannerStation } from "./planner-ui-fixtures";
import {
  assistantCenter,
  nearbyContext,
  NEXON,
} from "./recommendation-fixtures";
import type { ConnectorDto } from "../src/domain/station";
import type { EvModel } from "../src/domain/ev-models";
import type { RecommendationRequest } from "../src/domain/recommendation";
const request: RecommendationRequest & { evModel: EvModel } = {
  evModel: NEXON,
  batteryPercent: 35,
  context: nearbyContext,
};
const gun: ConnectorDto = {
  type: "CCS2",
  powerKw: 120,
  status: "available",
  tariffInrPerKwh: null,
};
function candidate(
  id = "charger",
  distance = 5,
  connectors = [gun],
): RecommendationCandidate {
  return {
    station: { ...plannerStation, id, connectors },
    roadDistanceKm: distance,
    detourKm: 0,
    progressKm: distance,
  };
}
afterEach(() => vi.restoreAllMocks());
it("has approximate, positive specs for exactly the registration models", () => {
  expect(EV_SPECS.size).toBe(EV_MODELS.length);
  for (const spec of EV_SPECS.values())
    expect(Math.min(...Object.values(spec))).toBeGreaterThan(0);
  for (const model of EV_MODELS)
    expect(EV_SPECS.get(model)).toEqual({
      batteryKwh: expect.any(Number),
      ratedRangeKm: expect.any(Number),
      maxDcKw: expect.any(Number),
      maxAcKw: expect.any(Number),
    });
});
it("enforces the unrounded 10% reserve, including an exact boundary", () => {
  const distance = 465 * 0.9 * 0.25;
  expect(
    rankRecommendations([candidate("edge", distance)], request)
      .recommendations[0]?.arrivalPercent,
  ).toBe(10);
  expect(
    rankRecommendations([candidate("past", distance + 0.01)], request)
      .recommendations,
  ).toEqual([]);
  expect(
    rankRecommendations([candidate("zero", 0)], {
      ...request,
      batteryPercent: 10,
    }).recommendations,
  ).toHaveLength(1);
  expect(
    rankRecommendations([candidate("zero", 0)], {
      ...request,
      batteryPercent: 9.99,
    }).recommendations,
  ).toEqual([]);
});
it("rejects incompatible, busy, offline and zero-power ports and caps DC and AC power", () => {
  const bad = [
    candidate("incompatible", 0, [{ ...gun, type: "CHADEMO" }]),
    candidate("busy", 0, [{ ...gun, status: "busy" }]),
    candidate("offline", 0, [{ ...gun, status: "offline" }]),
    candidate("zero", 0, [{ ...gun, powerKw: 0 }]),
  ];
  expect(rankRecommendations(bad, request).recommendations).toEqual([]);
  const result = rankRecommendations(
    [
      candidate("dc", 0, [gun, { ...gun, status: "busy" }]),
      candidate("ac", 0, [{ ...gun, type: "TYPE2", powerKw: 22 }]),
    ],
    request,
  );
  expect(
    result.recommendations.map(({ effectivePowerKw }) => effectivePowerKw),
  ).toEqual([60, 7.2]);
  expect(result.recommendations[0]?.reason).toContain(
    "1 of 2 compatible ports free",
  );
  expect(result.recommendations[0]?.chargeMinutes).toBe(
    Math.ceil(((40.5 * (0.8 - 0.35)) / 60) * 1.1 * 60),
  );
});
it("returns at most three, rewards free guns in nearby and area modes, and breaks ties by speed then id", () => {
  const candidates = [
    candidate("slow", 0, [{ ...gun, powerKw: 30 }]),
    candidate("fast-b", 0),
    candidate("fast-a", 0),
    candidate("many", 0, [gun, gun]),
  ];
  for (const mode of ["nearby", "area"] as const) {
    const ranked = rankRecommendations(candidates, {
      ...request,
      batteryPercent: 100,
      context: { ...nearbyContext, mode },
    });
    expect(ranked.recommendations.map(({ station }) => station.id)).toEqual([
      "many",
      "fast-a",
      "fast-b",
    ]);
    expect(
      ranked.recommendations.every(({ chargeMinutes }) => chargeMinutes === 0),
    ).toBe(true);
  }
});
it("balances drive and charge time rather than only power", () => {
  const near = candidate("near", 0, [{ ...gun, powerKw: 30 }]);
  const distant = candidate("distant", 15);
  expect(
    rankRecommendations([distant, near], request).recommendations[0]?.station
      .id,
  ).toBe("near");
});
it("rewards route progress when reachable, but penalizes detour plus charging time", () => {
  const context = {
    mode: "route",
    origin: assistantCenter,
    destination: { lat: 16.5062, lng: 80.648 },
    bufferKm: 5,
  } as const;
  const early = candidate("early", 5);
  const later = candidate("later", 60);
  const detour = {
    ...later,
    station: { ...later.station, id: "detour" },
    detourKm: 20,
  };
  expect(
    rankRecommendations([early, later, detour], {
      ...request,
      batteryPercent: 90,
      context,
    }).recommendations.map(({ station }) => station.id),
  ).toEqual(["later", "early", "detour"]);
});
it("plainly explains low battery, unreachable free chargers and empty or incompatible data", () => {
  const low = rankRecommendations([candidate("near", 2)], {
    ...request,
    batteryPercent: 3,
  });
  expect(low.recommendations).toEqual([]);
  expect(low.message).toContain("~2 km; you have ~0 km with that reserve");
  expect(low.reachableRangeKm).toBe(0);
  expect(rankRecommendations([], request).message).toContain(
    "No available compatible chargers",
  );
});
it.each(["nearby", "area"] as const)(
  "uses existing station service and road factor for %s",
  async (mode) => {
    const station = {
      ...plannerStation,
      lat: assistantCenter.lat + 0.01,
      lng: assistantCenter.lng,
    };
    const nearby = vi.spyOn(stations, "findNearby").mockResolvedValue({
      stations: [station],
      center: assistantCenter,
      radiusKm: 10,
      sources: ["local"],
    });
    const context = { ...nearbyContext, mode, radiusKm: 10 };
    const result = await recommendCharging(
      { ...request, context },
      "test-request",
    );
    expect(nearby).toHaveBeenCalledWith(
      { ...assistantCenter, radiusKm: 10 },
      "test-request",
    );
    expect(result.recommendations[0]?.roadDistanceKm).toBeCloseTo(
      Math.round(haversineKm(assistantCenter, station) * 13) / 10,
    );
  },
);
it.each([false, true])(
  "uses route progress plus detour, conservative when fallback=%s",
  async (fallback) => {
    const corridor = vi.spyOn(routes, "findCorridor").mockResolvedValue({
      ...corridorFixture,
      route: { ...corridorFixture.route, fallback },
      stations: [{ ...plannerStation, kmAlongRoute: 20, detourKm: 4 }],
    });
    const context = {
      mode: "route",
      origin: assistantCenter,
      destination: { lat: 16, lng: 80 },
      bufferKm: 10,
    } as const;
    const result = await recommendCharging(
      { ...request, context },
      "route-request",
    );
    expect(corridor).toHaveBeenCalledWith(
      {
        origin: assistantCenter,
        destination: context.destination,
        bufferKm: 10,
      },
      "route-request",
    );
    expect(result.recommendations[0]?.roadDistanceKm).toBeCloseTo(
      24 * (fallback ? 1.3 : 1),
    );
    expect(result.approximateRoadDistances).toBe(fallback);
  },
);
