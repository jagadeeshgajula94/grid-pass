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
const SEARCH_PLACES = "Search places";
const EXPLICIT_SEARCH_MODE = "mode=search";
const ARIA_ACTIVE_DESCENDANT = "aria-activedescendant";
const ARIA_EXPANDED = "aria-expanded";
const GUEST_RANGE = "Sign in to see range for your EV";
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
function mockPlanner(fallback = false): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    if (String(url).includes("geocode"))
      return Response.json({ places: [destination] });
    if (String(url).includes("corridor"))
      return Response.json({
        ...corridorFixture,
        route: { ...corridorFixture.route, fallback },
      });
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
  expect(screen.getByText("Hello, Aarav")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
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
  expect(input).toHaveAttribute(ARIA_ACTIVE_DESCENDANT);
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onSelect).toHaveBeenCalledWith(destination);
  expect(input).toHaveAttribute(ARIA_EXPANDED, "false");
  unmount();
  expect(fetcher.mock.calls.at(-1)?.[1]?.signal?.aborted).toBe(true);
});
it.each([{ isComposing: true }, { keyCode: 229 }])(
  "leaves IME composition keys untouched (%j)",
  async (composition) => {
    vi.useFakeTimers();
    const fetcher = mockPlanner();
    const onSelect = vi.fn();
    render(
      <PlaceAutocomplete label="Destination" value="" onSelect={onSelect} />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Vijay" } });
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(fireEvent.keyDown(input, { key: "Enter", ...composition })).toBe(
      true,
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "ArrowDown", ...composition });
    expect(input).not.toHaveAttribute(ARIA_ACTIVE_DESCENDANT);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter", ...composition });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape", ...composition });
    expect(input).toHaveAttribute(ARIA_EXPANDED, "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(destination);
    expect(input).toHaveAttribute(ARIA_EXPANDED, "false");
  },
);
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
it("scrolls the active keyboard option into view without requiring a browser scroll API", async () => {
  vi.useFakeTimers();
  const places = Array.from({ length: 10 }, (_, index) => ({
    ...destination,
    id: `place-${index}`,
    name: `Stop ${index + 1}`,
  }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ places })));
  render(<PlaceAutocomplete label="Destination" value="" onSelect={vi.fn()} />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "Stops" } });
  await act(() => vi.advanceTimersByTimeAsync(250));
  const scroll = vi.fn();
  for (const option of screen.getAllByRole("option"))
    Object.defineProperty(option, "scrollIntoView", { value: scroll });
  expect(scroll).not.toHaveBeenCalled();
  for (let index = 0; index < places.length; index++)
    fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(scroll).toHaveBeenLastCalledWith({ block: "nearest" });
  expect(scroll.mock.contexts.at(-1)).toBe(
    screen.getByRole("option", { name: "Stop 10" }),
  );
  fireEvent.keyDown(input, { key: "ArrowUp" });
  const active = screen.getByRole("option", { name: "Stop 9" });
  expect(scroll.mock.contexts.at(-1)).toBe(active);
  expect(input).toHaveAttribute(ARIA_ACTIVE_DESCENDANT, active.id);
});
it("requests Nominatim only after explicit Enter or Search places, not typing", async () => {
  vi.useFakeTimers();
  const fetcher = mockPlanner();
  render(<PlaceAutocomplete label="Destination" value="" onSelect={vi.fn()} />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "Vijay" } });
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(fetcher.mock.calls[0]?.[0]).toContain("mode=local");
  fireEvent.keyDown(input, { key: "Enter" });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(fetcher.mock.calls[1]?.[0]).toContain(EXPLICIT_SEARCH_MODE);
  fireEvent.click(screen.getByRole("button", { name: SEARCH_PLACES }));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(fetcher.mock.calls[2]?.[0]).toContain(EXPLICIT_SEARCH_MODE);
  fireEvent.change(input, { target: { value: "Other" } });
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(fetcher.mock.calls[3]?.[0]).toContain("mode=local");
});
it("cancels Search places mouse-down so Safari cannot blur the picker before click", async () => {
  vi.useFakeTimers();
  const fetcher = mockPlanner();
  render(<PlaceAutocomplete label="Destination" value="" onSelect={vi.fn()} />);
  const input = screen.getByRole("combobox");
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "Vijay" } });
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(fireEvent.mouseDown(screen.getByRole("option"))).toBe(false);
  const button = screen.getByRole("button", { name: SEARCH_PLACES });
  expect(fireEvent.mouseDown(button)).toBe(false);
  expect(document.activeElement).toBe(input);
  fireEvent.click(button);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(fetcher.mock.calls.at(-1)?.[0]).toContain(EXPLICIT_SEARCH_MODE);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(input).toHaveAttribute(ARIA_EXPANDED, "true");
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
it("lets guests browse stations, open the drawer and plan a route with neutral EV copy", async () => {
  mockPlanner();
  render(<MapWorkspace />);
  await screen.findByText(plannerStation.name);
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  expect(screen.queryByText(/Hello,/)).toBeNull();
  expect(screen.getByText(GUEST_RANGE)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Highway Charge/ }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  await planTrip();
  expect(screen.getByText(GUEST_RANGE)).toBeInTheDocument();
  expect(screen.queryByLabelText(NEARBY_RING)).toBeNull();
});
it("explains estimated EV range", () => {
  expect(rangeContext("Tata Nexon EV", 275)).toContain("within your");
  expect(rangeContext("Kia EV6", 500)).toContain("plan a charge stop");
  expect(rangeContext("unknown")).toContain("Range varies");
  expect(rangeContext("", 100, true)).toBe(GUEST_RANGE);
});
it("never promises EV range when only fallback geometry is available", async () => {
  mockPlanner(true);
  render(<MapWorkspace firstName="Aarav" evModel="Tata Nexon EV" />);
  await planTrip();
  expect(
    screen.getByText(/Approximate straight-line .*Road distance unavailable/),
  ).toBeInTheDocument();
  expect(screen.queryByText(/within your/)).toBeNull();
  expect(rangeContext("unknown", 100, true)).toContain(
    "Road distance unavailable",
  );
  expect(rangeContext("Tata Nexon EV", undefined, true)).not.toContain(
    "within your",
  );
});
