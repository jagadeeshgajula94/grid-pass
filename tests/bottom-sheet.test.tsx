// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { BottomSheet } from "../src/components/map/BottomSheet";
import {
  useSheet,
  nearestSnap,
  sheetHeights,
} from "../src/components/map/use-sheet";
import { FilterBar, filterCount } from "../src/components/map/FilterBar";
import {
  DEFAULT_FILTERS,
  filterStations,
} from "../src/components/map/filter-stations";
import { plannerStation } from "./planner-ui-fixtures";

const PANEL_HEIGHT = "Panel height";
const VALUE_TEXT = "aria-valuetext";
const AVAILABLE_NOW = "Available now";
const onHeight = vi.fn();
function Harness(): ReactElement {
  const sheet = useSheet();
  return (
    <BottomSheet sheet={sheet} onHeight={onHeight}>
      <button onClick={() => sheet.setSnap("full")}>Expand search</button>
    </BottomSheet>
  );
}
function Filters(): ReactElement {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [expanded, setExpanded] = useState(false);
  return (
    <FilterBar
      filters={filters}
      onChange={setFilters}
      expanded={expanded}
      onExpand={() => setExpanded(true)}
      onClose={() => setExpanded(false)}
    />
  );
}
beforeEach(() => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("snaps to the nearest height including bounded extremes", () => {
  expect(sheetHeights(844)).toEqual([150, 422, 764]);
  expect(nearestSnap(-100, 844)).toBe("peek");
  expect(nearestSnap(450, 844)).toBe("half");
  expect(nearestSnap(2000, 844)).toBe("full");
});
it("provides keyboard snap navigation, limits and search expansion", () => {
  render(<Harness />);
  const handle = screen.getByRole("slider", { name: PANEL_HEIGHT });
  expect(handle).toHaveAttribute(VALUE_TEXT, "peek");
  for (const key of ["ArrowUp", "ArrowRight", "ArrowUp"])
    fireEvent.keyDown(handle, { key });
  expect(handle).toHaveAttribute(VALUE_TEXT, "full");
  fireEvent.keyDown(handle, { key: "ArrowDown" });
  expect(handle).toHaveAttribute(VALUE_TEXT, "half");
  fireEvent.keyDown(handle, { key: "Home" });
  fireEvent.keyDown(handle, { key: "ArrowLeft" });
  fireEvent.keyDown(handle, { key: "Tab" });
  expect(handle).toHaveAttribute(VALUE_TEXT, "peek");
  fireEvent.keyDown(handle, { key: "End" });
  fireEvent.keyDown(handle, { key: "Home" });
  fireEvent.keyDown(handle, { key: "Enter" });
  fireEvent.keyDown(handle, { key: " " });
  expect(handle).toHaveAttribute(VALUE_TEXT, "full");
  fireEvent.keyDown(handle, { key: "Home" });
  fireEvent.click(screen.getByRole("button", { name: "Expand search" }));
  expect(handle).toHaveAttribute(VALUE_TEXT, "full");
});
it("drags, clamps, snaps and cancels without reacting to secondary pointers", () => {
  render(<Harness />);
  const handle = screen.getByRole("slider");
  const panel = screen.getByRole("region", { name: "Explore charging" });
  fireEvent.pointerMove(handle, { clientY: 100 });
  fireEvent.pointerUp(handle, { clientY: 100 });
  fireEvent.pointerDown(handle, { clientY: 700, button: 1 });
  fireEvent.pointerMove(handle, { clientY: 100 });
  expect(panel.style.height).toBe("");
  fireEvent.pointerDown(handle, { clientY: 700, button: 0 });
  fireEvent.pointerMove(handle, { clientY: 420 });
  expect(panel).toHaveStyle({ height: "430px" });
  fireEvent.pointerUp(handle, { clientY: 420 });
  expect(handle).toHaveAttribute(VALUE_TEXT, "half");
  fireEvent.pointerDown(handle, { clientY: 500, button: 0 });
  fireEvent.pointerMove(handle, { clientY: -1000 });
  expect(panel).toHaveStyle({ height: "764px" });
  fireEvent.pointerCancel(handle);
  expect(panel.style.height).toBe("");
});
it("observes sheet height, disconnects on unmount and starts desktop expanded", () => {
  vi.stubGlobal("innerWidth", 1440);
  const disconnect = vi.fn();
  let resize = (): void => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
  const { unmount } = render(<Harness />);
  expect(screen.getByRole("slider")).toHaveAttribute(VALUE_TEXT, "half");
  act(() => resize());
  expect(onHeight).toHaveBeenCalledWith(0);
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});
it("taps the handle to expand and collapse without a drag", () => {
  render(<Harness />);
  const handle = screen.getByRole("slider");
  for (const snap of ["half", "peek"]) {
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 });
    fireEvent.pointerUp(handle, { clientY: 100 });
    expect(handle).toHaveAttribute(VALUE_TEXT, snap);
  }
});
it("ignores desktop drags but retains collapse taps and keyboard expansion", () => {
  vi.stubGlobal("innerWidth", 1440);
  render(<Harness />);
  const handle = screen.getByRole("slider");
  const panel = screen.getByRole("region", { name: "Explore charging" });
  vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({
    ...new DOMRect(),
    height: 650,
  });
  for (const clientY of [0, 200]) {
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 });
    fireEvent.pointerMove(handle, { clientY });
    expect(panel.style.height).toBe("");
    fireEvent.pointerUp(handle, { clientY });
    expect(handle).toHaveAttribute(VALUE_TEXT, "half");
  }
  fireEvent.pointerDown(handle, { clientY: 100, button: 0 });
  fireEvent.pointerUp(handle, { clientY: 100 });
  expect(handle).toHaveAttribute(VALUE_TEXT, "peek");
  fireEvent.keyDown(handle, { key: "Enter" });
  expect(handle).toHaveAttribute(VALUE_TEXT, "half");
});
it("counts active filters, toggles quick chips, opens the panel and resets", () => {
  render(<Filters />);
  expect(screen.queryByLabelText("Connector")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: AVAILABLE_NOW }));
  fireEvent.click(screen.getByRole("button", { name: "Fast ≥50 kW" }));
  expect(screen.getByRole("button", { name: "Filters 2" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fast ≥50 kW" }));
  fireEvent.click(screen.getByRole("button", { name: "Filters 1" }));
  fireEvent.change(screen.getByLabelText("Connector"), {
    target: { value: "CCS2" },
  });
  expect(screen.getByText("2 active")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByText("0 active")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to stations" }));
  fireEvent.click(screen.getByRole("button", { name: AVAILABLE_NOW }));
  fireEvent.click(screen.getByRole("button", { name: AVAILABLE_NOW }));
  expect(screen.getByRole("button", { name: "Filters 0" })).toBeInTheDocument();
  expect(
    filterCount({
      connector: "CCS2",
      speed: "ultra",
      network: "statiq",
      availableOnly: true,
      minimumPowerKw: 50,
    }),
  ).toBe(5);
});
it("the fast chip matches all powers at least 50 kW, not the legacy 30–60 band", () => {
  const stations = [30, 50, 120].map((powerKw) => ({
    ...plannerStation,
    id: String(powerKw),
    connectors: plannerStation.connectors.map((port) => ({ ...port, powerKw })),
  }));
  expect(
    filterStations(stations, { ...DEFAULT_FILTERS, minimumPowerKw: 50 }).map(
      ({ id }) => id,
    ),
  ).toEqual(["50", "120"]);
  expect(
    filterStations([], { ...DEFAULT_FILTERS, minimumPowerKw: 50 }),
  ).toEqual([]);
});
