import { afterEach, expect, it, vi } from "vitest";
import { fetchCorridor, fetchPlaces } from "../src/components/map/route-client";
import { corridorFixture, destination } from "./planner-ui-fixtures";
const query = {
  origin: { lat: 17, lng: 78 },
  destination: { lat: 16, lng: 80 },
  bufferKm: 5,
};
afterEach(() => vi.unstubAllGlobals());
it("validates corridor and place responses, including empty lists", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(corridorFixture))
      .mockResolvedValueOnce(Response.json({ places: [destination] }))
      .mockResolvedValueOnce(Response.json({ places: [] })),
  );
  const signal = new AbortController().signal;
  expect(await fetchCorridor(query, signal)).toEqual({
    ok: true,
    value: corridorFixture,
  });
  expect(await fetchPlaces("Vijay", signal)).toEqual({
    ok: true,
    value: [destination],
  });
  expect(await fetchPlaces("Unknown", signal)).toEqual({ ok: true, value: [] });
});
it.each([401, 429, 500])("maps HTTP %s to safe failures", async (status) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status })),
  );
  const result = await fetchCorridor(query, new AbortController().signal);
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.error.code).toBe(
      status === 401 ? "UNAUTHENTICATED" : "UPSTREAM_UNAVAILABLE",
    );
});
it("rejects invalid geometry and station data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        ...corridorFixture,
        route: {
          ...corridorFixture.route,
          coordinates: [{ lat: 91, lng: 78 }],
        },
      }),
    ),
  );
  expect((await fetchCorridor(query, new AbortController().signal)).ok).toBe(
    false,
  );
});
it("ignores aborted requests", async () => {
  const controller = new AbortController();
  controller.abort();
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("Aborted", "AbortError")),
  );
  expect(await fetchCorridor(query, controller.signal)).toEqual({
    ok: true,
    value: null,
  });
});
