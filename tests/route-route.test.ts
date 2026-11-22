import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/routes/corridor/route";
import { RouteService } from "../src/services/route.service";
import * as service from "../src/services/route.service";
import { OsrmRouteRepository } from "../src/repositories/route.repository";
import { HttpOpenChargeMapRepository } from "../src/repositories/open-charge-map.repository";
import type { CorridorDto } from "../src/domain/route";
import { routeQuerySchema } from "../src/validation/route.schema";
import { plannerCookie } from "./planner-test-helpers";
import { logEvent } from "../src/lib/logger";
const BASE = "http://localhost:3000/api/routes/corridor";
const trip = {
  origin: { lat: 17.385, lng: 78.4867 },
  destination: { lat: 16.5062, lng: 80.648 },
};
afterEach(() => vi.restoreAllMocks());
function request(body: unknown, cookie = ""): Request {
  return new Request(BASE, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify(body),
  });
}
it("requires authentication", async () => {
  expect((await POST(request(trip))).status).toBe(401);
});
it("rejects malformed, out-of-range, extra fields and invalid buffers", async () => {
  const cookie = await plannerCookie();
  for (const body of [
    {},
    { ...trip, origin: { lat: 91, lng: 78 } },
    { ...trip, destination: { lat: 16, lng: -181 } },
    { ...trip, bufferKm: 0 },
    { ...trip, bufferKm: 16 },
    { ...trip, extra: true },
    { ...trip, origin: { ...trip.origin, extra: true } },
  ]) {
    expect((await POST(request(body, cookie))).status).toBe(400);
  }
  expect(
    (
      await POST(
        new Request(BASE, {
          method: "POST",
          headers: { cookie },
          body: "not json",
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await POST(request({ ...trip, junk: "x".repeat(5000) }, cookie))).status,
  ).toBe(400);
  for (const bufferKm of [1, 15])
    expect(routeQuerySchema.safeParse({ ...trip, bufferKm }).success).toBe(
      true,
    );
});
it("returns densified fallback, default buffer and ordered highway stations on OSRM failure", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
  const routes = new RouteService(
    new OsrmRouteRepository(fetcher),
    new HttpOpenChargeMapRepository("", fetcher),
  );
  vi.spyOn(service, "findCorridor").mockImplementation((query) =>
    routes.findCorridor(query),
  );
  const response = await POST(request(trip, await plannerCookie()));
  expect(response.status).toBe(200);
  const body = (await response.json()) as CorridorDto;
  expect(body.bufferKm).toBe(5);
  expect(body.route.fallback).toBe(true);
  expect(body.route.coordinates.length).toBeGreaterThan(40);
  expect(body.route.totalDistanceKm).toBeGreaterThan(240);
  expect(body.stations.length).toBeGreaterThan(0);
  expect(
    body.stations.every(
      (station, index) =>
        station.distanceKm <= 5 &&
        (!index ||
          station.kmAlongRoute >=
            (body.stations.at(index - 1)?.kmAlongRoute ?? 0)),
    ),
  ).toBe(true);
  await routes.findCorridor(routeQuerySchema.parse(trip));
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("maps OSRM geometry and supports empty filtered results", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      code: "Ok",
      routes: [
        {
          distance: 280000,
          duration: 18000,
          geometry: {
            type: "LineString",
            coordinates: [
              [78.4867, 17.385],
              [80.648, 16.5062],
            ],
          },
        },
      ],
    }),
  );
  const routes = new RouteService(
    new OsrmRouteRepository(fetcher),
    new HttpOpenChargeMapRepository("", fetcher),
  );
  const result = await routes.findCorridor(
    routeQuerySchema.parse({ ...trip, minKw: 400 }),
  );
  expect(result.route).toMatchObject({
    totalDistanceKm: 280,
    estimatedDurationMin: 300,
    fallback: false,
  });
  expect(result.stations).toEqual([]);
});
it("returns safe unexpected failures", async () => {
  vi.spyOn(service, "findCorridor").mockRejectedValue(new Error("private"));
  const response = await POST(request(trip, await plannerCookie()));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Something went wrong" });
});
it("aborts stalled OSRM at four seconds and caches the fallback without network access", async () => {
  const fetcher = vi.fn<typeof fetch>(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Timed out", "TimeoutError")),
          { once: true },
        );
      }),
  );
  const routes = new RouteService(
    new OsrmRouteRepository(fetcher),
    new HttpOpenChargeMapRepository("", fetcher),
  );
  const query = routeQuerySchema.parse(trip);
  const start = performance.now();
  const result = await routes.findCorridor(query);
  const elapsedMs = Math.round(performance.now() - start);
  expect(result.route.fallback).toBe(true);
  expect(result.route.coordinates.length).toBeGreaterThan(40);
  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(elapsedMs).toBeGreaterThanOrEqual(3900);
  const cachedStart = performance.now();
  expect((await routes.findCorridor(query)).route.fallback).toBe(true);
  logEvent("info", "test.osrm_timeout", "timeout-probe", {
    elapsedMs,
    cachedMs: Math.round(performance.now() - cachedStart),
    coordinates: result.route.coordinates.length,
    distanceKm: result.route.totalDistanceKm,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
}, 8000);
