// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MapCanvas } from "../src/components/map/MapCanvas";
import type { StationDto } from "../src/domain/station";

const state = vi.hoisted(() => ({
  zoom: 12,
  fail: false,
  handlers: new Map<string, Set<() => void>>(),
  setStyle: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  easeTo: vi.fn(),
  remove: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
}));
class MockMap {
  constructor() {
    if (state.fail) throw new Error("WebGL unavailable");
  }
  addControl = vi.fn();
  on(event: string, handler: () => void): this {
    const handlers = state.handlers.get(event) ?? new Set();
    handlers.add(handler);
    state.handlers.set(event, handlers);
    return this;
  }
  off(event: string, handler: () => void): this {
    state.handlers.get(event)?.delete(handler);
    return this;
  }
  setStyle = state.setStyle;
  fitBounds = state.fitBounds;
  flyTo = state.flyTo;
  easeTo = state.easeTo;
  remove = state.remove;
  addSource = state.addSource;
  addLayer = state.addLayer;
  removeLayer = state.removeLayer;
  removeSource = state.removeSource;
  getLayer(): boolean {
    return true;
  }
  getSource(): boolean {
    return true;
  }
  isStyleLoaded(): boolean {
    return true;
  }
  getZoom(): number {
    return state.zoom;
  }
  getBounds(): {
    getWest: () => number;
    getEast: () => number;
    getSouth: () => number;
    getNorth: () => number;
  } {
    return {
      getWest: () => 78.4,
      getEast: () => 78.6,
      getSouth: () => 17.3,
      getNorth: () => 17.5,
    };
  }
}
class MockMarker {
  private readonly element: HTMLElement;
  private coordinates: number[] = [];
  constructor({ element }: { element: HTMLElement }) {
    this.element = element;
  }
  setLngLat(coordinates: number[]): this {
    this.coordinates = coordinates;
    return this;
  }
  getLngLat(): number[] {
    return this.coordinates;
  }
  addTo(): this {
    document.body.append(this.element);
    return this;
  }
  remove(): void {
    this.element.remove();
  }
}
vi.mock("maplibre-gl", () => ({
  Map: vi.fn(function () {
    return new MockMap();
  }),
  Marker: vi.fn(function (options: { element: HTMLElement }) {
    return new MockMarker(options);
  }),
  NavigationControl: vi.fn(),
  setWorkerUrl: vi.fn(),
}));
const center = { lat: 17.385, lng: 78.4867 };
const station: StationDto = {
  ...center,
  id: "one",
  name: "Koti charging",
  address: "Koti",
  network: "statiq",
  distanceKm: 0,
  connectors: [
    { type: "CCS2", powerKw: 60, status: "available", tariffInrPerKwh: 21 },
  ],
  amenities: [],
  lastUpdated: "2026-01-01T00:00:00.000Z",
};
function emit(event: string): void {
  act(() => {
    for (const handler of state.handlers.get(event) ?? []) handler();
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.handlers.clear();
  state.zoom = 12;
  state.fail = false;
});
afterEach(cleanup);
it("renders React pins, a center marker and radius; re-adds layers on style changes", () => {
  const onSelect = vi.fn();
  const { rerender, unmount } = render(
    <MapCanvas
      center={center}
      light={false}
      stations={[station]}
      selected={null}
      onSelect={onSelect}
    />,
  );
  expect(
    screen.getByRole("img", { name: "Search center" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Koti charging/ }));
  expect(onSelect).toHaveBeenCalledWith(station);
  expect(state.addSource).toHaveBeenCalledWith(
    "radius",
    expect.objectContaining({ type: "geojson" }),
  );
  rerender(
    <MapCanvas
      center={{ lat: 17.39, lng: 78.49 }}
      light
      stations={[station]}
      selected={station}
      onSelect={onSelect}
    />,
  );
  expect(state.setStyle).toHaveBeenLastCalledWith(
    expect.stringContaining("voyager"),
  );
  emit("style.load");
  expect(state.addLayer).toHaveBeenCalledWith(
    expect.objectContaining({ id: "radius-outline" }),
  );
  expect(state.flyTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [station.lng, station.lat] }),
  );
  emit("error");
  expect(screen.getByRole("status")).toHaveTextContent("Map tiles unavailable");
  emit("load");
  expect(screen.queryByRole("status")).toBeNull();
  unmount();
  expect(state.remove).toHaveBeenCalledOnce();
  expect(screen.queryByRole("img", { name: "Search center" })).toBeNull();
});
it("clusters nearby pins, zooms on click, reuses markers and removes stale pins", () => {
  const onSelect = vi.fn();
  const stations = [
    station,
    { ...station, id: "two", lng: station.lng + 0.0001 },
  ];
  const { rerender } = render(
    <MapCanvas
      center={center}
      light={false}
      stations={stations}
      selected={null}
      onSelect={onSelect}
    />,
  );
  const cluster = screen.getByRole("button", { name: "Zoom into 2 stations" });
  fireEvent.click(cluster);
  expect(state.easeTo).toHaveBeenCalled();
  emit("moveend");
  expect(screen.getByRole("button", { name: "Zoom into 2 stations" })).toBe(
    cluster,
  );
  state.zoom = 18;
  emit("moveend");
  expect(screen.queryByRole("button", { name: /Zoom into/ })).toBeNull();
  expect(screen.getAllByRole("button", { name: /Koti charging/ })).toHaveLength(
    2,
  );
  rerender(
    <MapCanvas
      center={center}
      light={false}
      stations={[]}
      selected={null}
      onSelect={onSelect}
    />,
  );
  expect(screen.queryByRole("button", { name: /Koti charging/ })).toBeNull();
});
it("keeps the rest of the UI usable without WebGL", () => {
  state.fail = true;
  render(
    <MapCanvas
      center={center}
      light={false}
      stations={[]}
      selected={null}
      onSelect={vi.fn()}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Map unavailable on this device",
  );
});
