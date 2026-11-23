// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { useLocation } from "../src/components/map/use-location";
import { useMapArea, boundsToArea } from "../src/components/map/use-map-area";
import { useStations } from "../src/components/map/use-stations";
import { LocationBanner } from "../src/components/map/LocationBanner";
import { plannerStation } from "./planner-ui-fixtures";
import { haversineKm } from "../src/lib/geo";

const BOUNDS = { south: 17.5, north: 17.52, west: 78.37, east: 78.39 };
function geolocation(): {
  getCurrentPosition: ReturnType<typeof vi.fn>;
  watchPosition: ReturnType<typeof vi.fn>;
  clearWatch: ReturnType<typeof vi.fn>;
} {
  const api = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn().mockReturnValue(42),
    clearWatch: vi.fn(),
  };
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: api,
  });
  return api;
}
function position(
  accuracy: number,
  latitude = 17.517,
  longitude = 78.385,
): { coords: { accuracy: number; latitude: number; longitude: number } } {
  return { coords: { accuracy, latitude, longitude } };
}
function emptyResponse(): Response {
  return Response.json({
    stations: [],
    center: { lat: 17.517, lng: 78.385 },
    radiusKm: 5,
    sources: [],
  });
}
async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });
});
it("requests high accuracy, refines a fix, preserves a searched origin and clears watches", () => {
  const api = geolocation();
  const { result, unmount } = renderHook(() => useLocation());
  expect(api.getCurrentPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
  expect(api.watchPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    expect.objectContaining({ enableHighAccuracy: true }),
  );
  act(() => api.getCurrentPosition.mock.calls[0]?.[0](position(1800)));
  expect(result.current).toMatchObject({
    position: { lat: 17.517, lng: 78.385 },
    accuracy: 1800,
    errorKind: null,
    resolved: true,
  });
  act(() => api.watchPosition.mock.calls[0]?.[0](position(30, 17.518)));
  expect(result.current.center.lat).toBeCloseTo(17.518);
  expect(result.current.accuracy).toBe(30);
  act(() => api.watchPosition.mock.calls[0]?.[0](position(2000, 18)));
  act(() => api.watchPosition.mock.calls[0]?.[1]({ code: 3 }));
  expect(result.current.center.lat).toBeCloseTo(17.518);
  act(() => result.current.choose({ lat: 12, lng: 77 }, "Bengaluru"));
  act(() => api.watchPosition.mock.calls[0]?.[0](position(10, 17.519)));
  expect(result.current.center).toEqual({ lat: 12, lng: 77 });
  expect(result.current.position?.lat).toBeCloseTo(17.519);
  unmount();
  expect(api.clearWatch).toHaveBeenCalledWith(42);
});
it.each([
  [1, "denied"],
  [2, "unavailable"],
  [3, "timeout"],
])(
  "exposes failure %s without pretending fallback is a location",
  (code, kind) => {
    const api = geolocation();
    const { result } = renderHook(() => useLocation());
    act(() => api.getCurrentPosition.mock.calls[0]?.[1]({ code }));
    expect(result.current).toMatchObject({
      errorKind: kind,
      position: null,
      accuracy: null,
      location: "Hyderabad",
      resolved: true,
    });
    expect(result.current.status).toContain("location unavailable");
  },
);
it("retries, cleans up the previous watch and ignores obsolete callbacks", () => {
  const api = geolocation();
  const { result, unmount } = renderHook(() => useLocation());
  act(() => result.current.retry());
  expect(api.clearWatch).toHaveBeenCalledWith(42);
  act(() => api.getCurrentPosition.mock.calls[0]?.[0](position(1)));
  act(() => api.getCurrentPosition.mock.calls[0]?.[1]({ code: 1 }));
  expect(result.current.resolved).toBe(false);
  act(() => api.watchPosition.mock.calls[1]?.[0](position(25)));
  expect(result.current.accuracy).toBe(25);
  unmount();
  act(() => api.watchPosition.mock.calls[1]?.[0](position(1)));
  expect(api.clearWatch).toHaveBeenCalledTimes(2);
});
it("names unsupported location and offers accessible recovery actions", () => {
  const { result } = renderHook(() => useLocation());
  expect(result.current.errorKind).toBe("unsupported");
  const onRetry = vi.fn();
  const onSearch = vi.fn();
  const { rerender } = render(
    <LocationBanner
      errorKind="unsupported"
      onRetry={onRetry}
      onSearch={onSearch}
    />,
  );
  expect(
    screen.getByRole("status", { name: "Location unavailable" }),
  ).toHaveTextContent("not supported");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  fireEvent.click(screen.getByRole("button", { name: "Search my area" }));
  expect(onRetry).toHaveBeenCalledOnce();
  expect(onSearch).toHaveBeenCalledOnce();
  rerender(
    <LocationBanner errorKind={null} onRetry={onRetry} onSearch={onSearch} />,
  );
  expect(screen.queryByRole("status")).toBeNull();
});
it("uses half the shorter visible dimension, including a zoomed-in 1–2 km area", () => {
  expect(boundsToArea(BOUNDS)).toEqual({
    center: { lat: 17.51, lng: 78.38 },
    radiusKm: 1.1,
  });
  expect(
    boundsToArea({ ...BOUNDS, west: 78.3, east: 78.5 }).radiusKm,
  ).toBeCloseTo(1.1);
  expect(
    boundsToArea({ ...BOUNDS, east: 78.371, north: 17.501 }).radiusKm,
  ).toBe(1);
  expect(
    boundsToArea({ south: -60, north: 60, west: -180, east: 180 }).radiusKm,
  ).toBe(50);
  expect(
    boundsToArea({ south: -1, north: 1, west: 179, east: -179 }).center.lng,
  ).toBe(-180);
});
it("resets area state and ignores movement while route mode disables discovery", () => {
  const { result, rerender } = renderHook(
    ({ enabled }) => useMapArea(enabled),
    { initialProps: { enabled: true } },
  );
  act(() => result.current.onArea(BOUNDS));
  expect(result.current.area?.radiusKm).toBeCloseTo(1.1);
  act(() => result.current.reset());
  expect(result.current.area).toBeNull();
  act(() => result.current.onArea(BOUNDS));
  rerender({ enabled: false });
  act(() => result.current.onArea(BOUNDS));
  expect(result.current.area).toBeNull();
});
it.each([
  { lat: 17.0004, radiusKm: 1 },
  { lat: 17, radiusKm: 1.04 },
])(
  "refetches boundary chargers for a changed circle $lat/$radiusKm",
  async (next) => {
    vi.useFakeTimers();
    const center = { lat: 17, lng: 78 };
    const common = {
      ...plannerStation,
      ...center,
      id: "common",
      distanceKm: 0,
    };
    const edge = { ...common, id: "edge", lat: 17.00904 };
    const nextCenter = { ...center, lat: next.lat };
    const reply = (stations: (typeof common)[]): Response =>
      Response.json({ stations, center, radiusKm: 1, sources: [] });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply([common]))
      .mockResolvedValueOnce(
        reply([
          { ...common, distanceKm: haversineKm(nextCenter, common) },
          { ...edge, distanceKm: haversineKm(nextCenter, edge) },
        ]),
      );
    vi.stubGlobal("fetch", fetcher);
    const { result, rerender } = renderHook(
      ({ lat, radiusKm }) => useStations({ lat, lng: 78 }, true, radiusKm),
      { initialProps: { lat: 17, radiusKm: 1 } },
    );
    await advance(0);
    expect(result.current.stations.map(({ id }) => id)).toEqual(["common"]);
    rerender(next);
    await advance(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.stations.map(({ id }) => id)).toEqual([
      "common",
      "edge",
    ]);
    expect(result.current.stations[0]?.distanceKm).toBeCloseTo(
      haversineKm(nextCenter, common),
    );
    const url = new URL(fetcher.mock.calls[1]?.[0], "http://localhost:3000");
    expect(url.searchParams.get("lat")).toBe(String(next.lat));
    expect(url.searchParams.get("radiusKm")).toBe(String(next.radiusKm));
    rerender({ lat: 17, radiusKm: 1 });
    await advance(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.stations.map(({ id }) => id)).toEqual(["common"]);
    expect(result.current.stations[0]?.distanceKm).toBe(0);
  },
);
it("debounces areas, aborts previous requests, spaces calls and reuses exact cache keys", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(emptyResponse()));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender, unmount } = renderHook(
    ({ lat }) => useStations({ lat, lng: 78 }, true, 10, 400),
    { initialProps: { lat: 17 } },
  );
  await advance(399);
  expect(fetcher).not.toHaveBeenCalled();
  rerender({ lat: 17.1 });
  await advance(399);
  expect(fetcher).not.toHaveBeenCalled();
  await advance(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result.current).toMatchObject({
    stations: [],
    error: "",
    loading: false,
  });
  rerender({ lat: 18 });
  expect(fetcher.mock.calls[0]?.[1].signal.aborted).toBe(true);
  await advance(1499);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
  rerender({ lat: 17.1 });
  expect(result.current.loading).toBe(false);
  await advance(1500);
  expect(fetcher).toHaveBeenCalledTimes(2);
  rerender({ lat: 19 });
  unmount();
  await advance(2000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("expires station cache entries and never caches errors", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(emptyResponse()));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(
    ({ lat }) => useStations({ lat, lng: 78 }),
    { initialProps: { lat: 17 } },
  );
  await advance(0);
  await advance(60001);
  rerender({ lat: 18 });
  await advance(0);
  fetcher.mockRejectedValueOnce(new Error("offline"));
  rerender({ lat: 17 });
  await advance(0);
  expect(result.current.error).toContain("Connection unavailable");
  rerender({ lat: 18 });
  rerender({ lat: 17 });
  await advance(0);
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(result.current.error).toBe("");
});
