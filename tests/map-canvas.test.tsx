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
import { corridorFixture } from "./planner-ui-fixtures";
import { circleCoordinates } from "../src/lib/geo";
const RADIUS_OUTLINE = "radius-outline";
const YOUR_LOCATION = "Your location";
const ZOOM_NEARBY = "Zoom into 2 stations";

const state = vi.hoisted(() => ({
  zoom: 12,
  fail: false,
  handlers: new Map<string, Set<(event?: { originalEvent?: Event }) => void>>(),
  setStyle: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  easeTo: vi.fn(),
  remove: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
  unproject: vi.fn(([x, y]: [number, number]) => ({
    lng: 78.4 + x / 10000,
    lat: 17.5 - y / 10000,
  })),
}));
class MockMap {
  constructor() {
    if (state.fail) throw new Error("WebGL unavailable");
  }
  addControl = vi.fn();
  on(
    event: string,
    handler: (event?: { originalEvent?: Event }) => void,
  ): this {
    const handlers = state.handlers.get(event) ?? new Set();
    handlers.add(handler);
    state.handlers.set(event, handlers);
    return this;
  }
  off(
    event: string,
    handler: (event?: { originalEvent?: Event }) => void,
  ): this {
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
  getMaxZoom(): number {
    return 22;
  }
  getCenter(): typeof center {
    return center;
  }
  getContainer(): { clientWidth: number; clientHeight: number } {
    return { clientWidth: window.innerWidth, clientHeight: window.innerHeight };
  }
  unproject = state.unproject;
  project([lng, lat]: [number, number]): { x: number; y: number } {
    const scale = (512 * 2 ** state.zoom) / 360;
    return { x: lng * scale, y: -lat * scale };
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
function emit(event: string, payload?: { originalEvent?: Event }): void {
  act(() => {
    for (const handler of state.handlers.get(event) ?? []) handler(payload);
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.flyTo.mockReset();
  state.handlers.clear();
  state.zoom = 12;
  state.fail = false;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("starts attribution collapsed after loading and leaves its disclosure operable", () => {
  render(
    <MapCanvas
      center={center}
      light={false}
      stations={[]}
      selected={null}
      onSelect={vi.fn()}
    />,
  );
  const attribution = document.createElement("details");
  attribution.className = "maplibregl-ctrl-attrib maplibregl-compact-show";
  attribution.open = true;
  screen.getByLabelText("Charging stations map").append(attribution);
  emit("load");
  expect(attribution.open).toBe(false);
  expect(attribution).not.toHaveClass("maplibregl-compact-show");
  attribution.open = true;
  emit("style.load");
  expect(attribution.open).toBe(true);
});
it.each([150, 422, 764])(
  "fits phone routes clear of controls and a %i px sheet",
  (sheetHeight) => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    render(
      <MapCanvas
        center={center}
        light={false}
        stations={[]}
        selected={null}
        onSelect={vi.fn()}
        corridor
        route={corridorFixture.route}
        sheetHeight={sheetHeight}
      />,
    );
    expect(state.fitBounds).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({
        padding: {
          left: 48,
          right: 96,
          top: Math.min(100, Math.max(24, (844 - sheetHeight) * 0.2)),
          bottom: sheetHeight + 24,
        },
      }),
    );
    vi.unstubAllGlobals();
  },
);
it("fits above the measured phone sheet and updates padding on resize", () => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const { rerender } = render(
    <MapCanvas
      center={center}
      light={false}
      stations={[]}
      selected={null}
      onSelect={vi.fn()}
      sheetHeight={422}
    />,
  );
  expect(state.fitBounds).toHaveBeenLastCalledWith(
    expect.any(Array),
    expect.objectContaining({
      padding: { left: 48, right: 96, top: 84.4, bottom: 446 },
      duration: 0,
    }),
  );
  expect(screen.getByLabelText("Charging stations map")).toHaveStyle({
    "--sheet-offset": "434px",
  });
  vi.stubGlobal("innerWidth", 768);
  fireEvent(window, new Event("resize"));
  expect(state.fitBounds).toHaveBeenLastCalledWith(
    expect.any(Array),
    expect.objectContaining({
      padding: { left: 424, right: 80, top: 80, bottom: 40 },
    }),
  );
  rerender(
    <MapCanvas
      center={center}
      light={false}
      stations={[]}
      selected={station}
      onSelect={vi.fn()}
      sheetHeight={422}
    />,
  );
  expect(state.flyTo).toHaveBeenCalledWith(
    expect.objectContaining({ offset: [190, 0] }),
  );
  vi.unstubAllGlobals();
});
it.each([false, true])(
  "preserves the desktop camera on sheet measurements (corridor: %s)",
  (corridor) => {
    vi.stubGlobal("innerWidth", 1440);
    const props = {
      center,
      light: false,
      stations: [],
      selected: null,
      onSelect: vi.fn(),
      corridor,
      route: corridor ? corridorFixture.route : undefined,
    };
    const { rerender } = render(<MapCanvas {...props} sheetHeight={650} />);
    state.fitBounds.mockClear();
    emit("moveend");
    for (const sheetHeight of [150, 650]) {
      rerender(
        <MapCanvas
          {...props}
          center={{ ...center }}
          route={props.route ? { ...props.route } : undefined}
          sheetHeight={sheetHeight}
        />,
      );
      expect(state.fitBounds).not.toHaveBeenCalled();
    }
    fireEvent(window, new Event("resize"));
    expect(state.fitBounds).not.toHaveBeenCalled();
    const destination = { lat: 18, lng: 82 };
    rerender(
      <MapCanvas
        {...props}
        center={destination}
        route={
          corridor
            ? { ...corridorFixture.route, coordinates: [center, destination] }
            : undefined
        }
        sheetHeight={650}
      />,
    );
    expect(state.fitBounds).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  },
);
it("refits phone padding changes without refitting equal measurements", () => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  const props = {
    center,
    light: false,
    stations: [],
    selected: null,
    onSelect: vi.fn(),
  };
  const { rerender } = render(<MapCanvas {...props} sheetHeight={150} />);
  state.fitBounds.mockClear();
  rerender(<MapCanvas {...props} sheetHeight={422} />);
  expect(state.fitBounds).toHaveBeenCalledOnce();
  expect(state.fitBounds).toHaveBeenLastCalledWith(
    expect.any(Array),
    expect.objectContaining({
      padding: expect.objectContaining({ bottom: 446 }),
    }),
  );
  rerender(<MapCanvas {...props} center={{ ...center }} sheetHeight={422} />);
  expect(state.fitBounds).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
it("refits explicit recenter requests at unchanged coordinates after a pan", () => {
  vi.stubGlobal("innerWidth", 1440);
  const props = {
    center,
    light: false,
    stations: [],
    selected: null,
    onSelect: vi.fn(),
  };
  const { rerender } = render(<MapCanvas {...props} fitRequest={0} />);
  state.fitBounds.mockClear();
  emit("moveend");
  rerender(<MapCanvas {...props} fitRequest={1} />);
  expect(state.fitBounds).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
it.each([false, true])(
  "restores desktop overview after station details close (corridor: %s)",
  (corridor) => {
    vi.stubGlobal("innerWidth", 1440);
    const props = {
      center,
      light: false,
      stations: [],
      onSelect: vi.fn(),
      corridor,
      route: corridor ? corridorFixture.route : undefined,
    };
    const { rerender } = render(<MapCanvas {...props} selected={null} />);
    rerender(<MapCanvas {...props} selected={station} />);
    expect(state.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: 15 }),
    );
    state.fitBounds.mockClear();
    emit("moveend");
    rerender(<MapCanvas {...props} selected={null} />);
    expect(state.fitBounds).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  },
);
it("refits route endpoints when a desktop viewport narrows", () => {
  vi.stubGlobal("innerWidth", 1440);
  render(
    <MapCanvas
      center={center}
      light={false}
      stations={[]}
      selected={null}
      onSelect={vi.fn()}
      corridor
      route={corridorFixture.route}
    />,
  );
  state.fitBounds.mockClear();
  vi.stubGlobal("innerWidth", 1024);
  fireEvent(window, new Event("resize"));
  expect(state.fitBounds).toHaveBeenCalledOnce();
  expect(state.fitBounds).toHaveBeenLastCalledWith(
    expect.any(Array),
    expect.objectContaining({
      padding: { left: 424, right: 80, top: 80, bottom: 40 },
    }),
  );
  fireEvent(window, new Event("resize"));
  expect(state.fitBounds).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
it("renders React pins, a valid location marker and radius; re-adds layers on style changes", () => {
  const onSelect = vi.fn();
  const { rerender, unmount } = render(
    <MapCanvas
      center={center}
      position={center}
      light={false}
      stations={[station]}
      selected={null}
      onSelect={onSelect}
    />,
  );
  expect(screen.getByRole("img", { name: YOUR_LOCATION })).toBeInTheDocument();
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
    expect.objectContaining({ id: RADIUS_OUTLINE }),
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
  expect(screen.queryByRole("img", { name: YOUR_LOCATION })).toBeNull();
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
  const cluster = screen.getByRole("button", { name: ZOOM_NEARBY });
  fireEvent.click(cluster);
  expect(state.easeTo).toHaveBeenCalled();
  emit("moveend");
  expect(screen.getByRole("button", { name: ZOOM_NEARBY })).toBe(cluster);
  state.zoom = 22;
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
it.each([17, 18, 20, 22])(
  "keeps coincident pins clustered beyond the index limit at zoom %i",
  (zoom) => {
    state.zoom = zoom;
    const { unmount } = render(
      <MapCanvas
        center={center}
        position={center}
        light={false}
        stations={[station, { ...station, id: "coincident" }]}
        selected={null}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("img", { name: YOUR_LOCATION }).parentElement,
    ).toHaveClass("user-location-marker");
    const bubble = screen.getByRole("button", { name: ZOOM_NEARBY });
    fireEvent.click(bubble);
    expect(state.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: 22 }),
      expect.objectContaining({ originalEvent: expect.any(MouseEvent) }),
    );
    emit("move");
    emit("resize");
    expect(screen.getByRole("button", { name: ZOOM_NEARBY })).toBe(bubble);
    unmount();
    expect(state.handlers.get("move")?.size).toBe(0);
    expect(state.handlers.get("resize")?.size).toBe(0);
  },
);
it.each([
  {
    width: 390,
    height: 800,
    sheetHeight: 400,
    left: 48,
    right: 294,
    top: 80,
    bottom: 376,
  },
  {
    width: 1440,
    height: 900,
    sheetHeight: 600,
    left: 424,
    right: 1360,
    top: 80,
    bottom: 860,
  },
])(
  "discovers only the exposed map outside sheet padding at $width px",
  ({ width, height, sheetHeight, left, right, top, bottom }) => {
    vi.stubGlobal("innerWidth", width);
    vi.stubGlobal("innerHeight", height);
    const onArea = vi.fn();
    render(
      <MapCanvas
        center={center}
        light={false}
        stations={[]}
        selected={null}
        onSelect={vi.fn()}
        sheetHeight={sheetHeight}
        onArea={onArea}
      />,
    );
    emit("movestart", { originalEvent: new MouseEvent("mousedown") });
    emit("moveend");
    expect(onArea).toHaveBeenCalledWith({
      west: expect.closeTo(78.4 + left / 10000),
      east: expect.closeTo(78.4 + right / 10000),
      north: expect.closeTo(17.5 - top / 10000),
      south: expect.closeTo(17.5 - bottom / 10000),
    });
  },
);
it.each([false, true])(
  "refreshes area after a cluster tap unless route mode is %s",
  (corridor) => {
    const onArea = vi.fn();
    render(
      <MapCanvas
        center={center}
        light={false}
        stations={[station, { ...station, id: "second" }]}
        selected={null}
        onSelect={vi.fn()}
        onArea={onArea}
        corridor={corridor}
      />,
    );
    state.easeTo.mockImplementationOnce(
      (_options: unknown, eventData?: { originalEvent?: Event }) => {
        emit("movestart", eventData);
        emit("moveend", eventData);
      },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `Zoom into 2 ${corridor ? "stops" : "stations"}`,
      }),
    );
    expect(onArea).toHaveBeenCalledTimes(corridor ? 0 : 1);
    expect(state.easeTo).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ originalEvent: expect.any(MouseEvent) }),
    );
  },
);
it("only discovers user moves, not initial or programmatic camera movements or routes", () => {
  const onArea = vi.fn();
  const props = {
    center,
    light: false,
    stations: [],
    selected: null,
    onSelect: vi.fn(),
    onArea,
  };
  const { rerender } = render(<MapCanvas {...props} />);
  emit("movestart");
  emit("moveend");
  expect(onArea).not.toHaveBeenCalled();
  emit("movestart", { originalEvent: new MouseEvent("mousedown") });
  emit("moveend");
  expect(onArea).toHaveBeenCalledOnce();
  emit("moveend");
  expect(onArea).toHaveBeenCalledOnce();
  rerender(<MapCanvas {...props} corridor />);
  emit("moveend", { originalEvent: new WheelEvent("wheel") });
  expect(onArea).toHaveBeenCalledOnce();
});
it("keeps the area camera when station details close", () => {
  const props = {
    center,
    light: false,
    stations: [station],
    selected: null,
    onSelect: vi.fn(),
  };
  const { rerender } = render(<MapCanvas {...props} area />);
  rerender(<MapCanvas {...props} area selected={station} />);
  expect(state.flyTo).toHaveBeenCalledOnce();
  state.fitBounds.mockClear();
  state.flyTo.mockClear();
  rerender(<MapCanvas {...props} area />);
  expect(state.fitBounds).not.toHaveBeenCalled();
  expect(state.flyTo).not.toHaveBeenCalled();
  rerender(<MapCanvas {...props} />);
  expect(state.fitBounds).toHaveBeenCalledOnce();
});
it("draws the selected radar radius, hides it in area mode and preserves a panned area", () => {
  const props = {
    center,
    light: false,
    stations: [],
    selected: null,
    onSelect: vi.fn(),
  };
  const { rerender } = render(<MapCanvas {...props} radiusKm={20} />);
  expect(state.addSource).toHaveBeenCalledWith(
    "radius",
    expect.objectContaining({
      data: expect.objectContaining({
        geometry: {
          type: "Polygon",
          coordinates: [circleCoordinates(center, 20)],
        },
      }),
    }),
  );
  state.addSource.mockClear();
  state.fitBounds.mockClear();
  rerender(
    <MapCanvas
      {...props}
      center={{ lat: 17.4, lng: 78.5 }}
      area
      radiusKm={1.5}
    />,
  );
  expect(state.addSource).not.toHaveBeenCalledWith("radius", expect.anything());
  expect(state.fitBounds).not.toHaveBeenCalled();
  fireEvent(window, new Event("resize"));
  expect(state.fitBounds).not.toHaveBeenCalled();
  rerender(<MapCanvas {...props} radiusKm={20} />);
  expect(state.fitBounds).toHaveBeenCalledOnce();
});
it("omits a fallback dot and shows a valid accuracy circle with an approximate label only above 1000 m", () => {
  const props = {
    center,
    light: false,
    stations: [],
    selected: null,
    onSelect: vi.fn(),
  };
  const { rerender } = render(<MapCanvas {...props} />);
  expect(screen.queryByRole("img", { name: /Your/ })).toBeNull();
  rerender(<MapCanvas {...props} position={center} accuracy={1800} />);
  expect(screen.getByText("Approximate")).toBeInTheDocument();
  expect(state.addSource).toHaveBeenCalledWith(
    "location-accuracy",
    expect.objectContaining({
      data: expect.objectContaining({
        geometry: {
          type: "Polygon",
          coordinates: [circleCoordinates(center, 1.8)],
        },
      }),
    }),
  );
  rerender(<MapCanvas {...props} position={center} accuracy={1000} />);
  expect(screen.queryByText("Approximate")).toBeNull();
  expect(screen.getByRole("img", { name: YOUR_LOCATION })).toBeInTheDocument();
});
it.each([false, true])(
  "uses eased camera movement and honors reduced motion (%s)",
  (reduced) => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: reduced }));
    const stations = [
      station,
      { ...station, id: "two", lng: station.lng + 0.0001 },
    ];
    const props = { center, light: false, stations, onSelect: vi.fn() };
    const { rerender } = render(<MapCanvas {...props} selected={null} />);
    const motion = expect.objectContaining({
      duration: reduced ? 0 : 750,
      easing: expect.any(Function),
      essential: false,
    });
    expect(state.fitBounds).toHaveBeenCalledWith(expect.any(Array), motion);
    fireEvent.click(screen.getByRole("button", { name: ZOOM_NEARBY }));
    expect(state.easeTo).toHaveBeenCalledWith(
      motion,
      expect.objectContaining({ originalEvent: expect.any(MouseEvent) }),
    );
    rerender(<MapCanvas {...props} selected={station} />);
    expect(state.flyTo).toHaveBeenCalledWith(motion);
    vi.unstubAllGlobals();
  },
);
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
it("expands corridor clusters to route-numbered pins with the original selection", () => {
  const onSelect = vi.fn();
  const second = { ...station, id: "two", lng: station.lng + 0.0001 };
  const outside = { ...station, id: "outside", lng: 80 };
  const props = {
    center,
    light: false,
    selected: null,
    onSelect,
    corridor: true,
  };
  const { rerender, unmount } = render(
    <MapCanvas {...props} stations={[outside, station, second]} />,
  );
  const cluster = screen.getByRole("button", { name: "Zoom into 2 stops" });
  expect(cluster).toHaveTextContent("2");
  expect(screen.queryByRole("button", { name: /Stop / })).toBeNull();
  fireEvent.click(cluster);
  expect(state.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ zoom: expect.any(Number), duration: 750 }),
    expect.objectContaining({ originalEvent: expect.any(MouseEvent) }),
  );
  expect(onSelect).not.toHaveBeenCalled();
  state.zoom = 21;
  emit("moveend");
  expect(screen.queryByRole("button", { name: /Zoom into/ })).toBeNull();
  const pin = screen.getByRole("button", { name: "Stop 3: Koti charging" });
  expect(pin).toHaveTextContent("3");
  expect(
    screen.getByRole("button", { name: "Stop 2: Koti charging" }),
  ).toHaveTextContent("2");
  fireEvent.click(pin);
  expect(onSelect).toHaveBeenLastCalledWith(second);
  rerender(<MapCanvas {...props} stations={[second, station]} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Stop 1: Koti charging" }),
  );
  expect(onSelect).toHaveBeenLastCalledWith(second);
  state.zoom = 8;
  emit("moveend");
  expect(
    screen.getByRole("button", { name: "Zoom into 2 stops" }),
  ).toBeInTheDocument();
  rerender(<MapCanvas {...props} stations={[]} />);
  expect(screen.queryByRole("button", { name: /Zoom into|Stop / })).toBeNull();
  unmount();
  expect(state.handlers.get("moveend")?.size).toBe(0);
});
it.each([
  ["area", true, false, 1],
  ["radar", false, false, 0],
  ["route", true, true, 0],
] as const)(
  "refreshes assistant %s bounds only after the highlight camera settles",
  (_mode, area, corridor, count) => {
    vi.useFakeTimers();
    const onArea = vi.fn();
    const props = {
      center,
      light: false,
      stations: [station],
      selected: null,
      onSelect: vi.fn(),
      onArea,
      area,
      corridor,
    };
    const { rerender, unmount } = render(
      <MapCanvas {...props} sheetHeight={422} />,
    );
    let movement:
      { originalEvent?: Event; recommendationAreaMove?: boolean } | undefined;
    state.flyTo.mockImplementation(
      (_options: unknown, eventData?: typeof movement) => {
        if (movement)
          for (const handler of state.handlers.get("moveend") ?? [])
            handler(movement);
        movement = eventData;
        for (const handler of state.handlers.get("movestart") ?? [])
          handler(eventData);
      },
    );
    rerender(<MapCanvas {...props} sheetHeight={422} highlighted={station} />);
    expect(onArea).not.toHaveBeenCalled();
    rerender(<MapCanvas {...props} sheetHeight={450} highlighted={station} />);
    expect(onArea).not.toHaveBeenCalled();
    state.unproject.mockClear();
    emit("moveend", movement);
    expect(onArea).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    expect(onArea).toHaveBeenCalledTimes(count);
    expect(state.unproject).toHaveBeenCalledTimes(count * 4);
    emit("moveend");
    expect(onArea).toHaveBeenCalledTimes(count);
    emit("movestart", movement);
    emit("moveend", movement);
    unmount();
    act(() => vi.advanceTimersByTime(400));
    expect(onArea).toHaveBeenCalledTimes(count);
  },
);
it("refreshes an area highlight that finishes immediately as the map becomes ready", () => {
  vi.useFakeTimers();
  const onArea = vi.fn();
  state.flyTo.mockImplementation(
    (
      _options: unknown,
      eventData?: { originalEvent?: Event; recommendationAreaMove?: boolean },
    ) => {
      for (const type of ["movestart", "moveend"])
        for (const handler of state.handlers.get(type) ?? [])
          handler(eventData);
    },
  );
  render(
    <MapCanvas
      center={center}
      light={false}
      stations={[station]}
      selected={null}
      onSelect={vi.fn()}
      onArea={onArea}
      area
      highlighted={station}
    />,
  );
  expect(onArea).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(400));
  expect(onArea).toHaveBeenCalledOnce();
});
it.each([false, true])(
  "flies to and highlights an assistant result above the current sheet, reduced motion %s",
  (reduced) => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: reduced }));
    const props = {
      center,
      light: false,
      stations: [station],
      selected: null,
      onSelect: vi.fn(),
      area: true,
    };
    const { rerender, unmount } = render(
      <MapCanvas {...props} sheetHeight={422} />,
    );
    state.fitBounds.mockClear();
    rerender(<MapCanvas {...props} sheetHeight={422} highlighted={station} />);
    expect(
      screen.getByRole("img", { name: `Recommended charger: ${station.name}` }),
    ).toBeInTheDocument();
    expect(state.flyTo).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: [station.lng, station.lat],
        zoom: 15,
        duration: reduced ? 0 : 750,
        padding: { left: 48, right: 96, top: 84.4, bottom: 446 },
        offset: [0, 0],
      }),
      { recommendationAreaMove: true },
    );
    rerender(<MapCanvas {...props} sheetHeight={764} highlighted={station} />);
    expect(state.flyTo).toHaveBeenLastCalledWith(
      expect.objectContaining({
        padding: { left: 48, right: 96, top: 24, bottom: 788 },
      }),
      { recommendationAreaMove: true },
    );
    rerender(<MapCanvas {...props} sheetHeight={422} />);
    expect(state.fitBounds).not.toHaveBeenCalled();
    unmount();
    vi.unstubAllGlobals();
  },
);
it("hides the nearby ring in corridor mode, draws the route and restores nearby on clear", () => {
  const props = {
    center,
    light: false,
    stations: [],
    selected: null,
    onSelect: vi.fn(),
  };
  const { rerender } = render(
    <MapCanvas {...props} corridor route={corridorFixture.route} />,
  );
  expect(state.removeLayer).toHaveBeenCalledWith(RADIUS_OUTLINE);
  expect(state.addLayer).not.toHaveBeenCalledWith(
    expect.objectContaining({ id: RADIUS_OUTLINE }),
  );
  expect(state.addLayer).toHaveBeenCalledWith(
    expect.objectContaining({ id: "route-line" }),
  );
  expect(state.fitBounds).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({ maxZoom: 13 }),
  );
  state.addLayer.mockClear();
  rerender(<MapCanvas {...props} corridor={false} />);
  expect(state.removeLayer).toHaveBeenCalledWith("route-line");
  expect(state.addLayer).toHaveBeenCalledWith(
    expect.objectContaining({ id: RADIUS_OUTLINE }),
  );
});
