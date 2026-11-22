import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/geocode/search/route";
import { GeocodeService } from "../src/services/geocode.service";
import * as service from "../src/services/geocode.service";
import { NominatimGeocodeRepository } from "../src/repositories/geocode.repository";
import { plannerCookie } from "./planner-test-helpers";
import { AppError } from "../src/lib/errors";
const BASE = "http://localhost:3000/api/geocode/search";
let now = Date.now();
beforeEach(() => {
  now += 10000;
  vi.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("allows local autocomplete without a session", async () => {
  const response = await GET(new Request(`${BASE}?q=Vijay`));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    places: [{ name: "Vijayawada" }],
  });
});
it("allows explicit upstream search without a session", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));
  const geocode = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  vi.spyOn(service, "searchPlaces").mockImplementation(
    (query, requestId, mode) => geocode.search(query, requestId, mode),
  );
  const response = await GET(new Request(`${BASE}?q=Unknownplace&mode=search`));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ places: [] });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects invalid query, unknown and duplicate parameters", async () => {
  const headers = { cookie: await plannerCookie() };
  for (const query of [
    "q=x",
    "q=%3Cscript%3E",
    "q=Delhi%00City",
    "q=Delhi%0ACity",
    "q=Delhi%7Bcity%7D",
    "q=Delhi%3Bcity",
    "q=Vijay&q=Delhi",
    "q=Vijay&extra=1",
    "q=Vijay&mode=invalid",
    "q=Vijay&mode=local&mode=search",
    `q=${"a".repeat(81)}`,
    "",
  ])
    expect(
      (await GET(new Request(`${BASE}?${query}`, { headers }))).status,
    ).toBe(400);
});
it.each(["చెన్నై", "हैदराबाद", "హైదరాబాద్"])(
  "accepts combining marks in %s",
  async (query) => {
    const response = await GET(
      new Request(`${BASE}?${new URLSearchParams({ q: query })}`, {
        headers: { cookie: await plannerCookie() },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ places: [] });
  },
);
it("returns instant local landmarks without network and caches results", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
  const geocode = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  vi.spyOn(service, "searchPlaces").mockImplementation(
    (query, requestId, mode) => geocode.search(query, requestId, mode),
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
  expect(await geocode.search("Vijay")).toMatchObject({
    ok: true,
    value: [{ name: "Vijayawada" }],
  });
  expect(fetcher).not.toHaveBeenCalled();
});
it("returns local or empty fallback when an explicit upstream search fails", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
  const geocode = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  expect(await geocode.search("Unknownplace", undefined, "search")).toEqual({
    ok: true,
    value: [],
  });
  now += 1000;
  expect(await geocode.search("Vijay", undefined, "search")).toMatchObject({
    ok: true,
    value: [{ name: "Vijayawada" }],
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("caches explicit search results without exposing them to local autocomplete", async () => {
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
  const result = await geocode.search("Vijay", undefined, "search");
  expect(result.ok && result.value).toHaveLength(2);
  expect(await geocode.search("Vijay", undefined, "search")).toEqual(result);
  expect(await geocode.search("Vijay")).toMatchObject({
    ok: true,
    value: [{ name: "Vijayawada" }],
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("waits for the next global slot and reports excess queue pressure explicitly", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json([]));
  const first = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  const second = new GeocodeService(new NominatimGeocodeRepository(fetcher));
  await first.search("Unknownplace", undefined, "search");
  const queued = second.search("Anotherplace", undefined, "search");
  await vi.advanceTimersByTimeAsync(0);
  const overflow = await first.search("Thirdplace", undefined, "search");
  expect(overflow.ok).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(999);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(await queued).toEqual({ ok: true, value: [] });
  expect(await second.search("Anotherplace", undefined, "search")).toEqual({
    ok: true,
    value: [],
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("validates and forwards explicit mode and maps a full queue to a retryable error", async () => {
  const search = vi.spyOn(service, "searchPlaces").mockResolvedValue({
    ok: false,
    error: new AppError(
      "UPSTREAM_UNAVAILABLE",
      "Place search busy. Please retry.",
    ),
  });
  const response = await GET(
    new Request(`${BASE}?q=Vijay&mode=search`, {
      headers: { cookie: await plannerCookie() },
    }),
  );
  expect(search).toHaveBeenCalledWith("Vijay", expect.any(String), "search");
  expect(response.status).toBe(503);
  expect(response.headers.get("retry-after")).toBe("1");
  expect(response.headers.get("cache-control")).toBe("no-store");
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
