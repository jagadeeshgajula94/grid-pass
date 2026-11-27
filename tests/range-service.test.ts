import { afterEach, expect, it, vi } from "vitest";
import {
  EV_CATALOGUE,
  SELECTABLE_PACKS,
  selectPack,
  findPack,
} from "../src/domain/ev-catalogue";
import {
  estimateRange,
  effectiveConsumption,
  predictedArrival,
} from "../src/services/range.service";
import { rankRecommendations } from "../src/services/recommendation.service";
import { registerSchema } from "../src/validation/auth.schema";
import { recommendationSchema } from "../src/validation/recommendation.schema";
import {
  candidate,
  DC_PORT,
  designPack,
  packById,
  rangeQuery,
  XEV_59,
} from "./range-fixtures";
afterEach(() => vi.restoreAllMocks());
it("keeps the documented provenance totals in sync with the catalogue", () => {
  const fields = EV_CATALOGUE.flatMap((pack) => Object.values(pack.provenance));
  expect(fields.filter((field) => field.kind === "published")).toHaveLength(85);
  expect(fields.filter((field) => field.kind === "measured")).toHaveLength(6);
  expect(fields.filter((field) => field.kind === "estimate")).toHaveLength(125);
  expect(
    new Set(fields.map((field) => field.source).filter(Boolean)).size,
  ).toBe(21);
});
it("uses pack-specific loops with highway consumption below city, without changing the 59 kWh packs", () => {
  for (const [id, city, highway] of [
    ["mahindra-xev-9e-79", 5.38, 6.18],
    ["mahindra-be-6-79", 5.55, 5.81],
  ] as const) {
    const pack = packById(id);
    expect(pack.cityWhPerKm).toBeCloseTo(1000 / city);
    expect(pack.highwayWhPerKm).toBeCloseTo(1000 / highway);
    expect(pack.highwayWhPerKm).toBeLessThan(pack.cityWhPerKm);
    expect(effectiveConsumption(pack, 60)).toBeCloseTo(
      ((pack.cityWhPerKm + pack.highwayWhPerKm) / 2) * 1.1,
    );
    expect(estimateRange(pack, 50, 80).rangeKm).toBeGreaterThan(
      estimateRange(pack, 50, 40).rangeKm,
    );
    expect(pack.provenance.cityWhPerKm.kind).toBe("measured");
    expect(pack.provenance.highwayWhPerKm.kind).toBe("measured");
  }
  expect(packById("mahindra-xev-9e-59").provenance.cityWhPerKm.kind).toBe(
    "estimate",
  );
  expect(packById("mahindra-be-6-59").provenance.highwayWhPerKm.kind).toBe(
    "estimate",
  );
});
it("P2': 59 kWh at 10% and 80 km/h matches ~30 km, with speed interpolation and cap", () => {
  const pack = packById(XEV_59);
  expect(estimateRange(pack, 10, 40).energyKwh).toBeCloseTo(5.9);
  expect(effectiveConsumption(pack, 40)).toBeCloseTo(165);
  expect(effectiveConsumption(pack, 80)).toBeCloseTo(198);
  expect(estimateRange(pack, 10, 80).rangeKm).toBeCloseTo(29.8, 1);
  expect(effectiveConsumption(pack, 60)).toBeCloseTo(181.5);
  expect(effectiveConsumption(pack, 20)).toBeCloseTo(165);
  expect(effectiveConsumption(pack, 100)).toBeCloseTo(198 * 1.4);
  expect(effectiveConsumption(pack, 150)).toBeCloseTo(198 * 1.8);
});
it("uses measured consumption without deriving consumption from claimed range or invented usable energy", () => {
  const pack = packById();
  expect(pack.cityWhPerKm).toBeCloseTo(1000 / 7.9);
  expect(pack.highwayWhPerKm).toBeCloseTo(1000 / 7.67);
  const changed = { ...pack, claimedRangeKm: 1, usableKwh: 1 };
  expect(estimateRange(changed, 35)).toEqual(estimateRange(pack, 35));
  expect(predictedArrival(designPack(), 90, 150, 148.5)).toBeCloseTo(40.5);
});
interface Trial {
  pack: ReturnType<typeof packById>;
  battery: number;
  distance: number;
  speed: number;
}
function* trials(): Generator<Trial> {
  let seed = 0x51afe;
  const random = (): number => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const pack of SELECTABLE_PACKS) {
    for (let i = 0; i < 20; i++) {
      const battery = 1 + random() * 99;
      const speed = random() * 150;
      const range = estimateRange(pack, battery, speed);
      yield { pack, battery, speed, distance: range.rangeKm * random() * 1.2 };
    }
  }
}
it("proof 1: A is a subset of F for every pack under seeded b/d/s inputs", () => {
  for (const { pack, battery, distance, speed } of trials()) {
    const range = estimateRange(pack, battery, speed);
    const arrival = predictedArrival(
      pack,
      battery,
      distance,
      range.consumptionWhPerKm,
    );
    if (arrival >= 10)
      expect(distance).toBeLessThanOrEqual(range.reachableRangeKm);
  }
});
it("proof 2: no A below 10%, even at zero distance", () => {
  for (const { pack, battery } of trials()) {
    const query = rangeQuery(1 + (battery % 9), pack.id);
    const result = rankRecommendations(
      [candidate("here", 0, [{ ...DC_PORT, type: "TYPE2" }])],
      query,
    );
    expect(result.tier).toBe("B");
    expect(result.message).not.toContain("≥10%");
    expect(result.recommendations[0]?.arrivalPercent).toBeLessThan(10);
  }
});
it("proof 3: output is nonempty exactly when F is nonempty", () => {
  for (const { pack, battery, distance, speed } of trials()) {
    const range = estimateRange(pack, battery, speed);
    const result = rankRecommendations(
      [candidate("one", distance, [{ ...DC_PORT, type: "TYPE2" }])],
      rangeQuery(battery, pack.id),
      true,
      speed,
    );
    expect(result.recommendations.length > 0).toBe(
      distance <= range.reachableRangeKm,
    );
  }
});
it("proof 4: shown stops retain 10% of current energy, or 1% with 10% road underestimate", () => {
  for (const { pack, battery, distance, speed } of trials()) {
    const range = estimateRange(pack, battery, speed);
    const result = rankRecommendations(
      [candidate("one", distance, [{ ...DC_PORT, type: "TYPE2" }])],
      rangeQuery(battery, pack.id),
      true,
      speed,
    );
    for (const stop of result.recommendations) {
      const used = (stop.roadDistanceKm * range.consumptionWhPerKm) / 1000;
      expect(range.energyKwh - used + 1e-10).toBeGreaterThanOrEqual(
        0.1 * range.energyKwh,
      );
      expect(range.energyKwh - 1.1 * used + 1e-10).toBeGreaterThanOrEqual(
        0.01 * range.energyKwh,
      );
    }
  }
});
it("proof 5: F/A eligibility only grows with battery, without asserting monotone top-three", () => {
  for (const { pack, battery, distance, speed } of trials()) {
    const lower = estimateRange(pack, battery, speed);
    const higher = estimateRange(pack, Math.min(100, battery + 10), speed);
    const lowArrival = predictedArrival(
      pack,
      battery,
      distance,
      lower.consumptionWhPerKm,
    );
    const highArrival = predictedArrival(
      pack,
      Math.min(100, battery + 10),
      distance,
      higher.consumptionWhPerKm,
    );
    expect(higher.rangeKm).toBeGreaterThanOrEqual(lower.rangeKm);
    expect(highArrival).toBeGreaterThanOrEqual(lowArrival);
    if (distance <= lower.reachableRangeKm)
      expect(distance).toBeLessThanOrEqual(higher.reachableRangeKm);
    if (lowArrival >= 10) expect(highArrival).toBeGreaterThanOrEqual(10);
  }
});
it("proof 6: busy or unknown never hides reachability", () => {
  for (const { pack, battery, distance, speed } of trials()) {
    const count = (status: typeof DC_PORT.status): number =>
      rankRecommendations(
        [candidate("one", distance, [{ ...DC_PORT, type: "TYPE2", status }])],
        rangeQuery(battery, pack.id),
        true,
        speed,
      ).recommendations.length;
    expect(count("busy")).toBe(count("available"));
    expect(count("unknown")).toBe(count("available"));
    expect(count("offline")).toBe(0);
  }
});
it("N1/N2: rejects invalid batteries, unsupported variants and invalid/missing car positions", () => {
  const query = rangeQuery();
  for (const batteryPercent of [0, 120, NaN, Infinity])
    expect(
      recommendationSchema.safeParse({ ...query, batteryPercent }).success,
    ).toBe(false);
  for (const carPosition of [
    undefined,
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: NaN, lng: 0 },
    { lat: 0, lng: Infinity },
    { lat: 0, lng: 0, extra: true },
  ])
    expect(
      recommendationSchema.safeParse({ ...query, carPosition }).success,
    ).toBe(false);
  expect(
    recommendationSchema.safeParse({ ...query, variantId: "unknown" }).success,
  ).toBe(false);
  expect(findPack("unknown")).toBeUndefined();
  expect(() =>
    rankRecommendations([], { ...query, variantId: "unknown" }),
  ).toThrow("Choose a supported EV");
});
it("validates registration pack/model agreement while keeping old accounts unconfirmed", () => {
  const profile = {
    fullName: "Test Driver",
    email: "test@example.com",
    phone: "+919876543210",
    evModel: "Kia EV6",
    password: "SafePassw0rd!Test",
  };
  expect(
    registerSchema.safeParse({ ...profile, variantId: "kia-ev6-77.4" }).success,
  ).toBe(true);
  expect(
    registerSchema.safeParse({ ...profile, variantId: "tata-nexon-ev-45" })
      .success,
  ).toBe(false);
  expect(
    registerSchema.safeParse({ ...profile, variantId: "missing" }).success,
  ).toBe(false);
  expect(selectPack({ evModel: profile.evModel })?.packConfirmed).toBe(false);
});
