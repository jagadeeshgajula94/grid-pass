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
import {
  MapWorkspace,
  assistantContext,
} from "../src/components/map/MapWorkspace";
import { assistantResponse } from "./recommendation-fixtures";
import { recommendationSchema } from "../src/validation/recommendation.schema";
import { destination } from "./planner-ui-fixtures";
import { useLocation } from "../src/components/map/use-location";
import { useStations } from "../src/components/map/use-stations";
import type { StationDto } from "../src/domain/station";
import { StrictMode } from "react";
import type { MapCanvas } from "../src/components/map/MapCanvas";

const mapCanvas = vi.hoisted(() =>
  vi.fn<(props: Parameters<typeof MapCanvas>[0]) => null>(() => null),
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
const CHARGE_ASSISTANT = "Charge assistant";
const FIND_STOPS = "Find charging stops";
it("chooses route before map area, otherwise area or the selected radar centre/radius", () => {
  const center = { lat: 17.517, lng: 78.385 };
  const state = {
    planner: { destination: null, bufferKm: 10 },
    search: { center: { ...center, id: "searched-origin", name: "Nizampet" } },
    discovery: {
      center: { lat: 17.52, lng: 78.4, id: "searched-area", name: "Area" },
      radiusKm: 2,
      area: { center, radiusKm: 2 },
    },
  };
  expect(assistantContext(state)).toEqual({
    mode: "area",
    center: { lat: 17.52, lng: 78.4 },
    radiusKm: 2,
  });
  expect(
    assistantContext({ ...state, planner: { ...state.planner, destination } }),
  ).toEqual({
    mode: "route",
    origin: center,
    destination: { lat: destination.lat, lng: destination.lng },
    destinationName: destination.name,
    bufferKm: 10,
  });
  expect(
    assistantContext({
      ...state,
      discovery: { ...state.discovery, area: null, radiusKm: 20 },
    }),
  ).toEqual({
    mode: "nearby",
    center: { lat: 17.52, lng: 78.4 },
    radiusKm: 20,
  });
  expect(
    recommendationSchema.safeParse({
      batteryPercent: 35,
      context: assistantContext(state),
    }).success,
  ).toBe(true);
});
it("normalizes long geocoded destination names before sending assistant context", () => {
  const center = { lat: 17.517, lng: 78.385 };
  const context = assistantContext({
    planner: {
      destination: { ...destination, name: `  ${"V".repeat(200)}  ` },
      bufferKm: 5,
    },
    search: { center },
    discovery: { center, radiusKm: 5, area: null },
  });
  expect(context).toMatchObject({ destinationName: "V".repeat(160) });
  expect(
    recommendationSchema.safeParse({ batteryPercent: 60, context }).success,
  ).toBe(true);
});
it("opens the assistant, sends radar context, highlights a result and returns focus on Back", async () => {
  mockNizampet();
  const fetcher = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(
      url.includes("recommendations") && init?.method === "POST"
        ? Response.json(assistantResponse)
        : response(),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<MapWorkspace evModel="Tata Nexon EV" firstName="Driver" />);
  await screen.findByText(STATION_NAME);
  fireEvent.click(screen.getByRole("button", { name: "10 km" }));
  fireEvent.click(screen.getByRole("button", { name: CHARGE_ASSISTANT }));
  expect(
    screen.getByRole("heading", { name: CHARGE_ASSISTANT }),
  ).toBeInTheDocument();
  expect(screen.getByText("Chargers within 10 km")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  const show = await screen.findByRole("button", { name: /Show .* on map/ });
  const post = fetcher.mock.calls.find(([url]) =>
    url.includes("recommendations"),
  );
  const payload: unknown = JSON.parse(String(post?.[1]?.body));
  expect(recommendationSchema.parse(payload).context).toEqual({
    mode: "nearby",
    center: { lat: 17.517, lng: 78.385 },
    radiusKm: 10,
  });
  fireEvent.click(show);
  expect(latestMap().highlighted?.id).toBe(
    assistantResponse.recommendations[0]?.station.id,
  );
  fireEvent.change(screen.getByLabelText("Battery percentage"), {
    target: { value: "3" },
  });
  expect(latestMap().highlighted).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("button", { name: CHARGE_ASSISTANT })).toHaveFocus();
  expect(document.querySelector(".bottom-sheet")).toHaveAttribute(
    "data-snap",
    "half",
  );
  expect(latestMap().highlighted).toBeNull();
});
function mockNizampet(): ReturnType<typeof vi.fn> {
  const getCurrentPosition = vi.fn((accept) =>
    accept({ coords: { latitude: 17.517, longitude: 78.385, accuracy: 40 } }),
  );
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}
it("issues a fresh preview after panning to an area and clears it on Current location", async () => {
  mockAssistantArea(STATION_NAME);
  render(<MapWorkspace evModel="Tata Nexon EV" />);
  await screen.findByText(STATION_NAME);
  fireEvent.click(screen.getByRole("button", { name: CHARGE_ASSISTANT }));
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  const show = await screen.findByRole("button", { name: /Show .* on map/ });
  fireEvent.click(show);
  const request = latestMap().highlightRequest;
  act(() =>
    latestMap().onArea?.({
      south: 17.5,
      north: 17.52,
      west: 78.37,
      east: 78.39,
    }),
  );
  fireEvent.click(show);
  expect(latestMap().highlightRequest).toBe((request ?? 0) + 1);
  expect(latestMap().highlighted).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: CURRENT_LOCATION }));
  expect(latestMap()).toMatchObject({
    highlighted: null,
    area: false,
    fitRequest: 1,
    center: { lat: 17.517, lng: 78.385 },
  });
});
function latestMap(): Parameters<typeof MapCanvas>[0] {
  const props = mapCanvas.mock.lastCall?.[0];
  if (!props) throw new Error("Map has not rendered");
  return props;
}
async function moveTime(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}
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
function response(name = STATION_NAME): Response {
  return Response.json({
    stations: [{ ...station, name }],
    center: { lat: station.lat, lng: station.lng },
    radiusKm: 5,
    sources: ["local"],
  });
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });
});
function mockAssistantArea(previewStation: string): ReturnType<typeof vi.fn> {
  mockNizampet();
  const fetcher = vi.fn((url: string) => {
    if (url.includes("recommendations"))
      return Promise.resolve(
        Response.json({ ...assistantResponse, contextMode: "area" }),
      );
    return Promise.resolve(
      response(url.includes("lat=17.53") ? previewStation : STATION_NAME),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
it("keeps previewed assistant stops highlighted while the area refreshes, then shows that area after Back", async () => {
  const previewStation = "Preview area charger";
  const fetcher = mockAssistantArea(previewStation);
  render(<MapWorkspace evModel="Tata Nexon EV" />);
  await screen.findByText(STATION_NAME);
  vi.useFakeTimers();
  act(() =>
    latestMap().onArea?.({
      south: 17.5,
      north: 17.52,
      west: 78.37,
      east: 78.39,
    }),
  );
  await moveTime(1500);
  fireEvent.click(screen.getByRole("button", { name: CHARGE_ASSISTANT }));
  fireEvent.click(screen.getByRole("button", { name: FIND_STOPS }));
  await moveTime(0);
  fireEvent.click(screen.getByRole("button", { name: /Show .* on map/ }));
  const highlighted = latestMap().highlighted;
  expect(highlighted).not.toBeNull();
  act(() =>
    latestMap().onArea?.({
      south: 17.52,
      north: 17.54,
      west: 78.37,
      east: 78.39,
    }),
  );
  await moveTime(1500);
  expect(
    screen.getByRole("region", { name: "Charging recommendations" }),
  ).toBeInTheDocument();
  expect(latestMap().highlighted).toEqual(highlighted);
  expect(
    fetcher.mock.calls.filter(([url]) => url.includes("recommendations")),
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(
    screen.getByRole("heading", { name: "In this area" }),
  ).toBeInTheDocument();
  expect(screen.getByText(previewStation)).toBeInTheDocument();
  expect(latestMap()).toMatchObject({
    area: true,
    center: { lat: 17.53, lng: 78.38 },
    highlighted: null,
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
  act(() => getCurrentPosition.mock.calls[1]?.[1]({ code: 2 }));
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
  expect(
    screen.getByText(/No chargers match within 5 km. Try 10 km/),
  ).toBeInTheDocument();
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
    expect(callbacks?.[2]).toMatchObject({
      timeout: 10000,
      enableHighAccuracy: true,
    });
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
it("provides radius chips that refetch and resize radar, with active re-selection a no-op", async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response()));
  vi.stubGlobal("fetch", fetcher);
  render(<MapWorkspace />);
  await screen.findByText(STATION_NAME);
  expect(latestMap().radiusKm).toBe(5);
  for (const radius of [10, 20, 5]) {
    fireEvent.click(screen.getByRole("button", { name: `${radius} km` }));
    await waitFor(() =>
      expect(
        screen.getByRole("complementary", { name: "Nearby stations" }),
      ).toHaveAttribute("aria-busy", "false"),
    );
    expect(latestMap().radiusKm).toBe(radius);
    expect(screen.getByText(`${radius} km radius`)).toBeInTheDocument();
  }
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual(
    expect.arrayContaining([
      expect.stringContaining("radiusKm=5"),
      expect.stringContaining("radiusKm=10"),
      expect.stringContaining("radiusKm=20"),
    ]),
  );
  const count = fetcher.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "5 km" }));
  expect(fetcher).toHaveBeenCalledTimes(count);
});
it.each(["station", "filters"])(
  "shows fallback recovery and focuses search from %s without a fake user position",
  async (view) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(response())),
    );
    render(<MapWorkspace />);
    await screen.findByText(STATION_NAME);
    expect(latestMap().position).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: view === "station" ? /Statiq/ : /Filters/,
      }),
    );
    expect(
      screen.getByRole("status", { name: "Location unavailable" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Search my area" }));
    expect(screen.getByRole("combobox", { name: "Origin" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Search my area" }));
    expect(screen.getByRole("combobox", { name: "Origin" })).toHaveFocus();
    expect(
      screen.getByRole("region", { name: "Explore charging" }),
    ).toHaveAttribute("data-snap", "full");
    fireEvent.click(screen.getByRole("button", { name: /Statiq/ }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("combobox", { name: "Origin" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(latestMap().fitRequest).toBe(1);
  },
);
it("returns from area to the real location and preserves the selected radar radius", async () => {
  const getCurrentPosition = mockNizampet();
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response()));
  vi.stubGlobal("fetch", fetcher);
  render(<MapWorkspace />);
  await screen.findByText(STATION_NAME);
  fireEvent.click(screen.getByRole("button", { name: "10 km" }));
  await waitFor(() =>
    expect(
      screen.getByRole("complementary", { name: "Nearby stations" }),
    ).toHaveAttribute("aria-busy", "false"),
  );
  vi.useFakeTimers();
  act(() =>
    latestMap().onArea?.({
      south: 17.5,
      north: 17.52,
      west: 78.37,
      east: 78.39,
    }),
  );
  expect(
    screen.getByRole("heading", { name: "In this area" }),
  ).toBeInTheDocument();
  expect(latestMap()).toMatchObject({ area: true, radiusKm: 1.1 });
  await moveTime(1500);
  expect(fetcher).toHaveBeenCalledTimes(3);
  act(() =>
    latestMap().onArea?.({
      south: 18.5,
      north: 18.52,
      west: 78.37,
      east: 78.39,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Back to my location" }));
  await moveTime(2000);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(latestMap()).toMatchObject({
    area: false,
    radiusKm: 10,
    center: { lat: 17.517, lng: 78.385 },
    position: { lat: 17.517, lng: 78.385 },
    fitRequest: 1,
  });
  expect(getCurrentPosition).toHaveBeenCalledTimes(2);
});
it("does not expose aborted requests as UI errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
  );
  const { result } = renderHook(() => useStations({ lat: 17, lng: 78 }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe("");
});
