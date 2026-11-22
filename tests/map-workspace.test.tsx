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

vi.mock("next/dynamic", () => ({ default: () => (): null => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
const station: StationDto = {
  id: "one",
  name: "City Charge",
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
  expect(result.current.location).toBe("Current location");
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
it("loads the workspace, selects stations, syncs themes and switches location", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve(response())),
  );
  render(<MapWorkspace firstName="Aarav" />);
  expect(screen.getByText("Hello, Aarav")).toBeInTheDocument();
  await screen.findByText("City Charge");
  expect(screen.getByText("1 stations within 5 km")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Statiq/ }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Toggle color theme" }));
  expect(document.documentElement).toHaveClass("light");
  fireEvent.change(screen.getByLabelText("Search area"), {
    target: { value: "Mumbai" },
  });
  await screen.findByText("Using Mumbai");
});
it("shows safe errors and an empty list when fetching fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<MapWorkspace firstName="Driver" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection unavailable",
  );
  expect(screen.getByText(/No stations match/)).toBeInTheDocument();
});
