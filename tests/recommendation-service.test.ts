import { afterEach, expect, it, vi } from "vitest";
import {
  rankRecommendations,
  recommendCharging,
} from "../src/services/recommendation.service";
import * as stations from "../src/services/station.service";
import * as routes from "../src/services/route.service";
import { haversineKm } from "../src/lib/geo";
import { corridorFixture } from "./planner-ui-fixtures";
import { assistantCenter, nearbyContext } from "./recommendation-fixtures";
import {
  candidate,
  DC_PORT,
  mockDesignPack,
  rangeQuery,
  XEV_59,
  TIAGO_19,
} from "./range-fixtures";
import { estimateRange } from "../src/services/range.service";
afterEach(() => vi.restoreAllMocks());
it.each([true, false])(
  "does not infer stranding from an unreachable panned area (has station: %s)",
  async (hasStation) => {
    const center = { lat: assistantCenter.lat, lng: assistantCenter.lng + 0.3 };
    vi.spyOn(stations, "findNearby").mockResolvedValue({
      stations: hasStation ? [{ ...candidate().station, ...center }] : [],
      center,
      radiusKm: 5,
      sources: ["local"],
    });
    const result = await recommendCharging({
      ...rangeQuery(3, TIAGO_19),
      context: { mode: "area", center, radiusKm: 5 },
    });
    expect(stations.findNearby).toHaveBeenCalledWith(
      { ...center, radiusKm: 5 },
      undefined,
    );
    expect(result.recommendations).toEqual([]);
    expect(result.message).toContain(
      "No charger in this area is within your range",
    );
    expect(result.message).toContain("nearby search around your car");
    expect(result.message).not.toContain("assistance");
  },
);
it("P2: shows the 500 m busy Nizampet charger at 10% in B, never a false A claim", () => {
  const result = rankRecommendations(
    [
      candidate("busy", 0.5 * 1.3, [
        { ...DC_PORT, powerKw: 30, status: "busy" },
      ]),
    ],
    rangeQuery(10, XEV_59),
  );
  expect(result.usableRangeKm).toBeCloseTo(35.76, 1);
  expect(result.tier).toBe("B");
  expect(result.message).toContain("Low battery");
  expect(result.message).not.toContain("≥10%");
  expect(result.recommendations[0]).toMatchObject({
    arrivalPercent: 9.8,
    chargeMinutes: 91,
    effectivePowerKw: 30,
    wait: { minutes: 30, estimated: true, unverified: true },
  });
});
it("P1: Nexon 45 at 35% has ~119 km and a top three comfortable list", () => {
  mockDesignPack();
  const result = rankRecommendations(
    [
      candidate("a", 1),
      candidate("b", 2),
      candidate("c", 3),
      candidate("d", 5),
    ],
    rangeQuery(),
  );
  expect(result.usableRangeKm).toBeCloseTo(119.3, 1);
  expect(result.tier).toBe("A");
  expect(result.recommendations).toHaveLength(3);
  expect(
    result.recommendations.every((stop) => stop.arrivalPercent >= 33),
  ).toBe(true);
});
it("N4: only offline or incompatible ports are not candidates", () => {
  const result = rankRecommendations(
    [
      candidate("off", 0, [{ ...DC_PORT, status: "offline" }]),
      candidate("wrong", 0, [{ ...DC_PORT, type: "CHADEMO" }]),
      candidate("zero", 0, [{ ...DC_PORT, powerKw: 0 }]),
    ],
    rangeQuery(),
  );
  expect(result.recommendations).toEqual([]);
  expect(result.message).toContain("No compatible chargers here");
  expect(rankRecommendations([], rangeQuery()).recommendations).toEqual([]);
});
it("N6: Tiago 19.2 at 3%, nearest 12 km straight-line, offers no stops", () => {
  const result = rankRecommendations(
    [candidate("far", 12 * 1.3)],
    rangeQuery(3, TIAGO_19),
  );
  expect(result.usableRangeKm).toBeCloseTo(5.51, 1);
  expect(result.recommendations).toEqual([]);
  expect(result.message).toBe(
    "Nearest charger ~16 km, you have ~5 km: call roadside assistance.",
  );
});
it("B<10: at 5% even a zero-distance charger can only be B", () => {
  const result = rankRecommendations([candidate("here", 0)], rangeQuery(5));
  expect(result.tier).toBe("B");
  expect(result.recommendations[0]?.tier).toBe("B");
  expect(result.message).not.toContain("≥10%");
});
it("keeps exact A and F eligibility boundaries and hides B only when A exists", () => {
  const pack = mockDesignPack();
  expect(rankRecommendations([candidate("here", 0)], rangeQuery(10)).tier).toBe(
    "A",
  );
  const range = estimateRange(pack, 100);
  const edge = range.reachableRangeKm;
  expect(
    rankRecommendations([candidate("edge", edge)], rangeQuery(100))
      .recommendations,
  ).toHaveLength(1);
  expect(
    rankRecommendations(
      [candidate("outside", edge + 0.000001)],
      rangeQuery(100),
    ).recommendations,
  ).toEqual([]);
  const mixed = rankRecommendations(
    [candidate("comfortable", 0), candidate("low", 110)],
    rangeQuery(),
  );
  expect(mixed.recommendations.map((stop) => stop.station.id)).toEqual([
    "comfortable",
  ]);
});
it("busy and unknown remain reachable, use flagged waits, and offline ports neither boost count nor power", () => {
  const result = rankRecommendations(
    [
      candidate("busy", 1, [
        { ...DC_PORT, status: "busy" },
        { ...DC_PORT, status: "busy" },
      ]),
      candidate("unknown", 1, [
        { ...DC_PORT, status: "unknown" },
        { ...DC_PORT, status: "offline" },
      ]),
      candidate("free", 1, [
        { ...DC_PORT, powerKw: 20 },
        { ...DC_PORT, powerKw: 400, status: "busy" },
      ]),
    ],
    rangeQuery(),
  );
  const byId = new Map(
    result.recommendations.map((stop) => [stop.station.id, stop]),
  );
  expect(byId.get("busy")?.wait).toEqual({
    minutes: 15,
    availability: "busy",
    estimated: true,
    unverified: true,
  });
  expect(byId.get("unknown")?.reason).toContain("availability unknown");
  expect(byId.get("unknown")?.wait.minutes).toBe(10);
  expect(byId.get("free")?.effectivePowerKw).toBe(20);
});
it("B ranks by unrounded distance, then wait plus charge, then power and id", () => {
  const busy = [{ ...DC_PORT, status: "busy" as const }];
  const result = rankRecommendations(
    [
      candidate("far-free", 1),
      candidate("near-busy", 0.9, busy),
      candidate("near-free", 0.9),
    ],
    rangeQuery(5),
  );
  expect(result.recommendations.map((stop) => stop.station.id)).toEqual([
    "near-free",
    "near-busy",
    "far-free",
  ]);
});
it("A nearby/area rewards free ports and breaks ties by higher capped power then id", () => {
  for (const mode of ["nearby", "area"] as const) {
    const result = rankRecommendations(
      [
        candidate("slow", 0, [{ ...DC_PORT, powerKw: 30 }]),
        candidate("fast-b", 0),
        candidate("fast-a", 0),
        candidate("many", 0, [DC_PORT, DC_PORT]),
      ],
      { ...rangeQuery(100), context: { ...nearbyContext, mode } },
    );
    expect(result.recommendations.map((stop) => stop.station.id)).toEqual([
      "many",
      "fast-a",
      "fast-b",
    ]);
    expect(
      result.recommendations.every((stop) => stop.chargeMinutes === 0),
    ).toBe(true);
  }
});
it.each(["nearby", "area"] as const)(
  "searches %s independently of car position and measures energy from the car",
  async (mode) => {
    const station = {
      ...candidate().station,
      ...assistantCenter,
      lat: assistantCenter.lat + 0.01,
    };
    const region = { lat: assistantCenter.lat + 0.2, lng: assistantCenter.lng };
    const nearby = vi.spyOn(stations, "findNearby").mockResolvedValue({
      stations: [station],
      center: region,
      radiusKm: 10,
      sources: ["local"],
    });
    const result = await recommendCharging(
      { ...rangeQuery(), context: { mode, center: region, radiusKm: 10 } },
      "request",
    );
    expect(nearby).toHaveBeenCalledWith({ ...region, radiusKm: 10 }, "request");
    expect(result.recommendations[0]?.roadDistanceKm).toBeCloseTo(
      haversineKm(assistantCenter, station) * 1.3,
    );
  },
);
it.each([false, true])(
  "uses route car projection and road factor, fallback=%s",
  async (fallback) => {
    vi.spyOn(routes, "findCorridor").mockResolvedValue({
      ...corridorFixture,
      route: {
        ...corridorFixture.route,
        coordinates: [assistantCenter, { lat: 16, lng: 80 }],
        fallback,
      },
      stations: [{ ...candidate().station, kmAlongRoute: 20, detourKm: 4 }],
    });
    const result = await recommendCharging({
      ...rangeQuery(90),
      context: {
        mode: "route",
        origin: assistantCenter,
        destination: { lat: 16, lng: 80 },
        bufferKm: 5,
      },
    });
    expect(result.recommendations[0]?.roadDistanceKm).toBeCloseTo(
      24 * (fallback ? 1.3 : 1),
    );
    expect(result.approximateRoadDistances).toBe(fallback);
  },
);
