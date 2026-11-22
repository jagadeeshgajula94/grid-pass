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
import { PlaceAutocomplete } from "../src/components/map/PlaceAutocomplete";
import { useCorridor } from "../src/components/map/use-corridor";
import { rangeContext } from "../src/components/map/ev-range";
import {
  corridorFixture,
  destination,
  plannerStation,
} from "./planner-ui-fixtures";
const NEARBY_RING = "Nearby ring";
vi.mock("next/dynamic", () => ({
  default:
    () =>
    ({ corridor }: { corridor: boolean }): React.ReactElement => (
      <div aria-label={corridor ? "Route polyline" : "Nearby ring"} />
    ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function mockPlanner(): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    if (String(url).includes("geocode"))
      return Response.json({ places: [destination] });
    if (String(url).includes("corridor")) return Response.json(corridorFixture);
    return Response.json({
      stations: [plannerStation],
      center: { lat: 17.385, lng: 78.4867 },
      radiusKm: 5,
      sources: ["local"],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
async function planTrip(): Promise<void> {
  fireEvent.change(screen.getByRole("combobox", { name: "Destination" }), {
    target: { value: "Vijay" },
  });
  fireEvent.click(
    await screen.findByRole("option", { name: destination.name }),
  );
  await screen.findByRole("complementary", { name: "Corridor stations" });
  await screen.findByText(/140.0 km along/);
}
it("switches to numbered corridor cards, opens the drawer, filters and clears back to nearby", async () => {
  mockPlanner();
  render(<MapWorkspace firstName="Aarav" evModel="Tata Nexon EV" />);
  await screen.findByText(plannerStation.name);
  expect(screen.getByLabelText(NEARBY_RING)).toBeInTheDocument();
  await planTrip();
  expect(screen.queryByLabelText(NEARBY_RING)).toBeNull();
  expect(screen.getByLabelText("Route polyline")).toBeInTheDocument();
  expect(
    screen.getByText("1", { selector: ".stop-number" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Highway Charge/ }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  fireEvent.change(screen.getByLabelText("Connector"), {
    target: { value: "CHADEMO" },
  });
  expect(screen.getByText(/No stations match/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Clear Route/ }));
  expect(screen.getByLabelText(NEARBY_RING)).toBeInTheDocument();
  expect(
    screen.getByRole("complementary", { name: "Nearby stations" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "5 km" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
it("refetches on buffer changes and swaps endpoints", async () => {
  const fetcher = mockPlanner();
  render(<MapWorkspace firstName="Aarav" />);
  await planTrip();
  fireEvent.click(screen.getByRole("button", { name: "10 km" }));
  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith(
      "/api/routes/corridor",
      expect.objectContaining({
        body: expect.stringContaining('"bufferKm":10'),
      }),
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Swap origin and destination" }),
  );
  expect(screen.getByRole("combobox", { name: "Origin" })).toHaveValue(
    destination.name,
  );
  expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue(
    "Hyderabad",
  );
});
it("debounces autocomplete, aborts obsolete requests and supports keyboard selection", async () => {
  vi.useFakeTimers();
  const fetcher = mockPlanner();
  const onSelect = vi.fn();
  const { unmount } = render(
    <PlaceAutocomplete label="Destination" value="" onSelect={onSelect} />,
  );
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "Vi" } });
  await act(() => vi.advanceTimersByTimeAsync(249));
  expect(fetcher).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "Vijay" } });
  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(250));
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input).toHaveAttribute("aria-activedescendant");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onSelect).toHaveBeenCalledWith(destination);
  expect(input).toHaveAttribute("aria-expanded", "false");
  unmount();
  expect(fetcher.mock.calls.at(-1)?.[1]?.signal?.aborted).toBe(true);
});
it("shows an empty search and safe error without exposing upstream details", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ places: [] }))
      .mockRejectedValueOnce(new Error("private")),
  );
  render(<PlaceAutocomplete label="Destination" value="" onSelect={vi.fn()} />);
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "Unknown" },
  });
  expect(await screen.findByText(/No places found/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "Other" },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection unavailable",
  );
});
it("ignores stale corridor completions and reports request failures", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(
    ({ buffer }) => useCorridor({ lat: 17, lng: 78 }, destination, buffer),
    { initialProps: { buffer: 5 } },
  );
  rerender({ buffer: 10 });
  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toContain("Connection unavailable");
});
it("explains estimated EV range", () => {
  expect(rangeContext("Tata Nexon EV", 275)).toContain("within your");
  expect(rangeContext("Kia EV6", 500)).toContain("plan a charge stop");
  expect(rangeContext("unknown")).toContain("Range varies");
});
