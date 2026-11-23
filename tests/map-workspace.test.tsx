// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { MapWorkspace } from "../src/components/map/MapWorkspace";
import { useLocation } from "../src/components/map/use-location";
import { useStations } from "../src/components/map/use-stations";
import type { StationDto } from "../src/domain/station";
import { StrictMode } from "react";

const mapCanvas = vi.hoisted(() =>
  vi.fn<(props: { fitRequest?: number }) => null>(() => null),
);
vi.mock("next/dynamic", () => ({ default: () => mapCanvas }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
const STATION_NAME = "City Charge";
const FALLBACK_ORIGIN = "Hyderabad — location unavailable";
const THEME_TOGGLE = "Toggle color theme";
const SEARCH_PROMPT = "Search a place or route";
const CURRENT_LOCATION = "Current location";
const station: StationDto = {
  id: "one",
  name: STATION_NAME,
  network: "statiq",
  lat: 17.385,
  lng: 78.4867,
  distanceKm: 1,
  address: "Koti",
  connectors: [
    { type: "CCS2", powerKw: 60, tariffInrPerKwh: 21, status: "available" },
  ],
  amenities: [],
  lastUpdated: "2026-01-01T00:00:00.000Z",
};
function response(): Response {
  return Response.json({
    stations: [station],
    center: { lat: station.lat, lng: station.lng },
    radiusKm: 5,
    sources: ["local"],
  });
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });
});
it("falls back when geolocation is missing and ignores obsolete requests", () => {
  const { result } = renderHook(() => useLocation());
  expect(result.current.status).toBe("Using Hyderabad — location unavailable");
  expect(result.current.center).toEqual({ lat: 17.385, lng: 78.4867 });
});
it("selects current position and ignores stale callbacks after preset changes", () => {
  const getCurrentPosition = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  const { result, unmount } = renderHook(() => useLocation());
  act(() =>
    getCurrentPosition.mock.calls[0]?.[0]({
      coords: { latitude: 13, longitude: 80 },
    }),
  );
  expect(result.current.location).toBe(CURRENT_LOCATION);
  act(() => result.current.locate());
  act(() => result.current.choose({ lat: 12, lng: 77 }, "Bengaluru"));
  act(() => getCurrentPosition.mock.calls[1]?.[1]());
  expect(result.current.location).toBe("Bengaluru");
  unmount();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });
});
it("aborts previous station requests and ignores stale completions", async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response()));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender, unmount } = renderHook(
    ({ lat }) => useStations({ lat, lng: 78 }),
    { initialProps: { lat: 17 } },
  );
  rerender({ lat: 18 });
  expect(fetcher.mock.calls[0]?.[1].signal.aborted).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  unmount();
  expect(fetcher.mock.calls.at(-1)?.[1].signal.aborted).toBe(true);
});
it("loads the workspace, selects stations, syncs themes and locates again", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(response())),
  );
  render(<MapWorkspace firstName="Aarav" />);
  expect(screen.getByText("Hello, Aarav")).toBeInTheDocument();
  await screen.findByText(STATION_NAME);
  expect(screen.getByLabelText("1 matching stations")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Statiq/ }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: THEME_TOGGLE }));
  expect(document.documentElement).toHaveClass("light");
  fireEvent.click(screen.getByRole("button", { name: /Current location/ }));
  fireEvent.click(screen.getByRole("button", { name: SEARCH_PROMPT }));
  expect(screen.getByRole("combobox", { name: "Origin" })).toHaveValue(
    FALLBACK_ORIGIN,
  );
  expect(
    screen.getByRole("region", { name: "Explore charging" }),
  ).toHaveAttribute("data-snap", "full");
  expect(screen.getByRole("combobox", { name: "Origin" })).toHaveFocus();
  expect(screen.queryByText(FALLBACK_ORIGIN)).toBeNull();
});
it("shows safe errors and an empty list when fetching fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<MapWorkspace firstName="Driver" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection unavailable",
  );
  expect(screen.getByText(/No stations match/)).toBeInTheDocument();
});
it("hides covered phone controls at full snap and restores them on desktop", async () => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(response())),
  );
  render(<MapWorkspace />);
  await screen.findByText(STATION_NAME);
  expect(
    screen.getByRole("navigation", { name: "Map controls" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: SEARCH_PROMPT }));
  expect(screen.queryByRole("navigation", { name: "Map controls" })).toBeNull();
  expect(screen.queryByRole("button", { name: THEME_TOGGLE })).toBeNull();
  expect(screen.getByRole("link", { name: "Sign in" })).toBeVisible();
  fireEvent.keyDown(screen.getByRole("slider"), { key: "Home" });
  expect(screen.getByRole("button", { name: THEME_TOGGLE })).toBeVisible();
  fireEvent.keyDown(screen.getByRole("slider"), { key: "End" });
  vi.stubGlobal("innerWidth", 1440);
  fireEvent(window, new Event("resize"));
  expect(screen.getByRole("button", { name: THEME_TOGGLE })).toBeVisible();
});
it("requests an overview when Current location resolves to the unchanged fallback", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(response())),
  );
  render(<MapWorkspace />);
  await screen.findByText(STATION_NAME);
  expect(mapCanvas.mock.lastCall?.[0]).toMatchObject({ fitRequest: 0 });
  fireEvent.click(screen.getByRole("button", { name: CURRENT_LOCATION }));
  expect(mapCanvas.mock.lastCall?.[0]).toMatchObject({ fitRequest: 1 });
});
it.each([false, true])(
  "sends one startup request after the fallback resolves (StrictMode: %s)",
  async (strict) => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(response()));
    vi.stubGlobal("fetch", fetcher);
    const workspace = <MapWorkspace firstName="Aarav" />;
    render(strict ? <StrictMode>{workspace}</StrictMode> : workspace);
    await screen.findByText(STATION_NAME);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1].signal.aborted).toBe(false);
  },
);
it.each(["success", "denied", "timeout"])(
  "waits for geolocation before fetching (%s)",
  async (outcome) => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(response()));
    vi.stubGlobal("fetch", fetcher);
    render(
      <StrictMode>
        <MapWorkspace firstName="Aarav" />
      </StrictMode>,
    );
    expect(fetcher).not.toHaveBeenCalled();
    const callbacks = getCurrentPosition.mock.calls.at(-1);
    expect(callbacks?.[2]).toMatchObject({ timeout: 5000 });
    act(() => {
      if (outcome === "success")
        callbacks?.[0]({ coords: { latitude: 13, longitude: 80 } });
      else callbacks?.[1]({ code: outcome === "denied" ? 1 : 3 });
    });
    await screen.findByText(STATION_NAME);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toContain(
      outcome === "success" ? "lat=13&lng=80" : "lat=17.385&lng=78.4867",
    );
    fireEvent.click(screen.getByRole("button", { name: SEARCH_PROMPT }));
    expect(screen.getByRole("combobox", { name: "Origin" })).toHaveValue(
      outcome === "success" ? CURRENT_LOCATION : FALLBACK_ORIGIN,
    );
  },
);
it("does not expose aborted requests as UI errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
  );
  const { result } = renderHook(() => useStations({ lat: 17, lng: 78 }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe("");
});
