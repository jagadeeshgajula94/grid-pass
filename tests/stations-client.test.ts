import { afterEach, expect, it, vi } from "vitest";
import { fetchStations } from "../src/components/map/stations-client";
import { AppError } from "../src/lib/errors";
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
it.each([
  [401, "UNAUTHENTICATED", "Session expired. Please sign in again."],
  [
    500,
    "UPSTREAM_UNAVAILABLE",
    "Unable to load stations. Try another location.",
  ],
  [200, "VALIDATION", "Station data unavailable."],
])(
  "handles invalid responses (%s) with typed safe errors",
  async (status, code, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({}, { status })),
    );
    const result = await fetchStations(center, new AbortController().signal);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(AppError);
    expect(result.error).toMatchObject({ code, message });
  },
);
it("handles connection errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const result = await fetchStations(center, new AbortController().signal);
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "UPSTREAM_UNAVAILABLE",
      message: "Connection unavailable. Please retry.",
    },
  });
});
it("classifies malformed JSON as a safe validation error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));
  expect(
    await fetchStations(center, new AbortController().signal),
  ).toMatchObject({
    ok: false,
    error: { code: "VALIDATION", message: "Station data unavailable." },
  });
});
it("classifies an AbortError as expected cancellation", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
  );
  expect(
    await fetchStations(center, new AbortController().signal),
  ).toMatchObject({
    ok: true,
    value: null,
  });
});
