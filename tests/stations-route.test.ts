import { expect, it, vi, afterEach } from "vitest";
import { GET } from "../src/app/api/stations/nearby/route";
import { POST as login } from "../src/app/api/auth/login/route";
import * as service from "../src/services/station.service";
import type { NearbyStations } from "../src/services/station.service";
const BASE = "http://localhost:3000/api/stations/nearby";
async function cookie(): Promise<string> {
  const response = await login(
    new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "aarav@example.com",
        password: process.env.MOCK_USER_PASSWORD,
      }),
    }),
  );
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}
afterEach(() => vi.restoreAllMocks());
it("allows nearby discovery without a session", async () => {
  const response = await GET(new Request(`${BASE}?lat=17.385&lng=78.4867`));
  expect(response.status).toBe(200);
  const body = (await response.json()) as NearbyStations;
  expect(body.radiusKm).toBe(5);
  expect(body.stations.length).toBeGreaterThan(0);
});
it("rejects bad latitude and duplicate parameters", async () => {
  const headers = { cookie: await cookie() };
  expect(
    (await GET(new Request(`${BASE}?lat=bad&lng=78`, { headers }))).status,
  ).toBe(400);
  expect(
    (await GET(new Request(`${BASE}?lat=17&lat=18&lng=78`, { headers })))
      .status,
  ).toBe(400);
});
it("returns Hyderabad stations and a fast cached response", async () => {
  const request = new Request(`${BASE}?lat=17.385&lng=78.4867`, {
    headers: { cookie: await cookie() },
  });
  const response = await GET(request);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, max-age=30");
  const body = (await response.json()) as NearbyStations;
  expect(body.stations.length).toBeGreaterThanOrEqual(10);
  expect(body.stations.every((station) => station.distanceKm <= 5)).toBe(true);
  expect(body.center).toEqual({ lat: 17.385, lng: 78.4867 });
  const start = performance.now();
  expect((await GET(request)).status).toBe(200);
  expect(performance.now() - start).toBeLessThan(1000);
});
it("returns generic errors for unexpected failures", async () => {
  vi.spyOn(service, "findNearby").mockRejectedValueOnce(new Error("private"));
  const response = await GET(
    new Request(`${BASE}?lat=17&lng=78`, {
      headers: { cookie: await cookie() },
    }),
  );
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Something went wrong" });
});
