import { expect, it, vi } from "vitest";
import { StationService, merge } from "../src/services/station.service";
import { STATION_SEED } from "../src/db/station-seed";
import { AppError } from "../src/lib/errors";
const query = { lat: 17.385, lng: 78.4867, radiusKm: 5 };
const NORTHWEST_AREAS = [
  "Nizampet",
  "Bachupally",
  "Miyapur",
  "KPHB",
  "Kukatpally",
  "Pragathi Nagar",
  "Hitech City",
];
function northwestHubs(): typeof STATION_SEED {
  return STATION_SEED.filter((station) =>
    NORTHWEST_AREAS.some(
      (area) => station.address === `${area} Charging Hub, Hyderabad`,
    ),
  );
}
it("seeds seven distinct northwest Hyderabad demo hubs with mixed networks and DC connectors", () => {
  const hubs = northwestHubs();
  expect(STATION_SEED.every((station) => station.statusSource === "demo")).toBe(
    true,
  );
  expect(hubs).toHaveLength(7);
  expect(new Set(STATION_SEED.map((station) => station.id)).size).toBe(
    STATION_SEED.length,
  );
  expect(new Set(hubs.map((station) => station.network)).size).toBe(5);
  expect(
    hubs.every(
      (station) =>
        station.id.startsWith("local-") &&
        station.name.includes("Charging Hub"),
    ),
  ).toBe(true);
  const connectors = hubs.flatMap((station) => station.connectors);
  expect(new Set(connectors.map((connector) => connector.powerKw))).toEqual(
    new Set([30, 60, 90, 120]),
  );
  expect(new Set(connectors.map((connector) => connector.status))).toEqual(
    new Set(["available", "busy"]),
  );
  expect(connectors.every((connector) => connector.type === "CCS2")).toBe(true);
});
it("serves six local demo hubs in Nizampet's default radar and adds Hitech City at 10 km", async () => {
  const service = new StationService({
    findNearby: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  });
  const center = { lat: 17.517, lng: 78.385 };
  const radar = await service.findNearby({ ...center, radiusKm: 5 });
  expect(radar.stations).toHaveLength(6);
  expect(radar.stations.every((station) => station.distanceKm <= 5)).toBe(true);
  expect(
    radar.stations.some((station) => station.address.startsWith("Nizampet ")),
  ).toBe(true);
  const wider = await service.findNearby({ ...center, radiusKm: 10 });
  expect(
    wider.stations.filter((station) =>
      northwestHubs().some((hub) => hub.id === station.id),
    ),
  ).toHaveLength(7);
  expect(
    wider.stations.some((station) =>
      station.address.startsWith("Hitech City "),
    ),
  ).toBe(true);
});
it("deduplicates ids before names or coordinates and preserves local priority", () => {
  const station = STATION_SEED[1];
  if (!station) throw new Error("Missing seed");
  const renamed = {
    ...station,
    name: "Unrelated renamed provider",
    lat: station.lat + 0.01,
  };
  const distinct = { ...renamed, id: "distinct" };
  expect(merge([station, renamed], [renamed])).toEqual([station]);
  expect(merge([], [station, renamed])).toEqual([station]);
  expect(merge([station], [distinct])).toEqual([station, distinct]);
  expect(merge([], [])).toEqual([]);
});
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
