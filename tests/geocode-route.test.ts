import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/geocode/search/route";
import { GeocodeService } from "../src/services/geocode.service";
import * as service from "../src/services/geocode.service";
import { NominatimGeocodeRepository } from "../src/repositories/geocode.repository";
import { plannerCookie } from "./planner-test-helpers";
const BASE = "http://localhost:3000/api/geocode/search";
let now = Date.now();
beforeEach(() => {
  now += 10000;
  vi.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => vi.restoreAllMocks());
it("requires authentication", async () => {
  expect((await GET(new Request(`${BASE}?q=Vijay`))).status).toBe(401);
});
it("rejects invalid query, unknown and duplicate parameters", async () => {
  const headers = { cookie: await plannerCookie() };
  for (const query of [
    "q=x",
    "q=%3Cscript%3E",
    "q=Vijay&q=Delhi",
    "q=Vijay&extra=1",
    `q=${"a".repeat(81)}`,
    "",
  ])
    expect(
      (await GET(new Request(`${BASE}?${query}`, { headers }))).status,
    ).toBe(400);
});
it("returns instant local landmarks without network and caches results", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
  const geocode = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  vi.spyOn(service, "searchPlaces").mockImplementation((query) =>
    geocode.search(query),
  );
  const response = await GET(
    new Request(`${BASE}?q=Vijay`, {
      headers: { cookie: await plannerCookie() },
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    places: [{ name: "Vijayawada" }],
  });
  expect(await geocode.search("Vijay")).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("returns empty fallback when upstream fails and throttles globally", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
  const geocode = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  expect(await geocode.search("Unknownplace")).toEqual([]);
  expect(await geocode.search("Anotherplace")).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("returns local matches immediately and merges deduplicated remote matches into cache", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json([
      {
        place_id: 1,
        display_name: "Vijayawada",
        lat: "16.5062",
        lon: "80.648",
      },
      { place_id: 2, display_name: "Vijay landmark", lat: "16.6", lon: "80.7" },
    ]),
  );
  const geocode = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  expect(await geocode.search("Vijay")).toHaveLength(1);
  await vi.waitFor(async () =>
    expect(await geocode.search("Vijay")).toHaveLength(2),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("validates Nominatim responses and sends usage-policy headers", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json([
        { place_id: 1, display_name: "Test, India", lat: "17", lon: "78" },
      ]),
    );
  const result = await new NominatimGeocodeRepository(fetcher).search("Test");
  expect(result).toEqual({
    ok: true,
    value: [{ id: "osm-1", name: "Test, India", lat: 17, lng: 78 }],
  });
  expect(fetcher).toHaveBeenCalledWith(
    expect.any(URL),
    expect.objectContaining({
      headers: { "User-Agent": expect.stringContaining("GridPass/0.1") },
    }),
  );
});
it("returns safe unexpected failures", async () => {
  vi.spyOn(service, "searchPlaces").mockRejectedValue(new Error("private"));
  expect(
    (
      await GET(
        new Request(`${BASE}?q=Vijay`, {
          headers: { cookie: await plannerCookie() },
        }),
      )
    ).status,
  ).toBe(500);
});
