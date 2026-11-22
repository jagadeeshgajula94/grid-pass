import { afterEach, expect, it, vi } from "vitest";
import { fetchStations } from "../src/components/map/stations-client";
const center = { lat: 17.385, lng: 78.4867 };
afterEach(() => vi.unstubAllGlobals());
it("validates response data and carries abort signals", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ stations: [], center, radiusKm: 5, sources: ["local"] }),
    );
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  expect(await fetchStations(center, signal)).toEqual({ ok: true, value: [] });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/stations/nearby?lat=17.385&lng=78.4867&radiusKm=5",
    { signal },
  );
});
it.each([401, 500, 200])("handles invalid responses (%s)", async (status) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({}, { status })),
  );
  expect((await fetchStations(center, new AbortController().signal)).ok).toBe(
    false,
  );
});
it("handles connection errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect((await fetchStations(center, new AbortController().signal)).ok).toBe(
    false,
  );
});
