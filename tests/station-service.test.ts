import { expect, it, vi } from "vitest";
import { StationService } from "../src/services/station.service";
import { STATION_SEED } from "../src/db/station-seed";
import { AppError } from "../src/lib/errors";
const query = { lat: 17.385, lng: 78.4867, radiusKm: 5 };
it("merges, dedupes and caches unfiltered cell candidates", async () => {
  const station = STATION_SEED[1];
  if (!station) throw new Error("Missing seed");
  const findNearby = vi.fn().mockResolvedValue({
    ok: true,
    value: [{ ...station, id: "remote-copy" }],
  });
  const service = new StationService({ findNearby });
  const first = await service.findNearby(query);
  expect(first.stations.length).toBeGreaterThanOrEqual(25);
  expect(first.stations.some((item) => item.id === "remote-copy")).toBe(false);
  expect(first.stations.every((item) => item.distanceKm <= 5)).toBe(true);
  const filtered = await service.findNearby({
    ...query,
    network: "ather-grid",
    connector: "TYPE2",
    availableOnly: true,
    minKw: 3,
  });
  expect(filtered.stations.length).toBeGreaterThan(0);
  expect(filtered.stations.every((item) => item.network === "ather-grid")).toBe(
    true,
  );
  expect(findNearby).toHaveBeenCalledTimes(1);
  expect((await service.findNearby({ ...query, minKw: 400 })).stations).toEqual(
    [],
  );
  expect(
    (await service.findNearby({ lat: 0, lng: 0, radiusKm: 5 })).stations,
  ).toEqual([]);
});
it("falls back to local stations on provider failure", async () => {
  const service = new StationService({
    findNearby: vi.fn().mockResolvedValue({
      ok: false,
      error: new AppError("UPSTREAM_UNAVAILABLE", "Unavailable"),
    }),
  });
  const result = await service.findNearby(query);
  expect(result.sources).toEqual(["local"]);
  expect(result.stations.length).toBeGreaterThanOrEqual(25);
});
