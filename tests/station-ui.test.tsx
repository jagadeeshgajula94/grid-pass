// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  filterStations,
  DEFAULT_FILTERS,
} from "../src/components/map/filter-stations";
import { StationDrawer } from "../src/components/map/StationDrawer";
import { StationList } from "../src/components/map/StationList";
import { StationPin } from "../src/components/map/StationPin";
import { FilterBar } from "../src/components/map/FilterBar";
import { LocationPresets } from "../src/components/map/LocationPresets";
import { stationSummary } from "../src/components/map/station-display";
import type { ConnectorDto, StationDto } from "../src/domain/station";

const busyPort: ConnectorDto = {
  type: "TYPE2",
  powerKw: 11,
  tariffInrPerKwh: null,
  status: "busy",
};
it("does not mislabel unknown occupancy as offline", () => {
  expect(
    stationSummary({
      ...station,
      connectors: [{ ...busyPort, status: "unknown" }],
    }).status,
  ).toBe("unknown");
});

const station: StationDto = {
  id: "one",
  name: "<img src=x onerror=alert(1)>",
  network: "statiq",
  lat: 17.385,
  lng: 78.4867,
  distanceKm: 1.2,
  address: "Koti, Hyderabad",
  lastUpdated: "2026-01-01T00:00:00.000Z",
  amenities: ["restroom", "cafe", "dining", "wifi"],
  connectors: [
    { type: "CCS2", powerKw: 60, tariffInrPerKwh: 21, status: "available" },
    busyPort,
    { type: "CHADEMO", powerKw: 120, tariffInrPerKwh: 24, status: "offline" },
  ],
};
const stations: StationDto[] = [
  station,
  {
    ...station,
    id: "two",
    distanceKm: 0.5,
    network: "zeon" as const,
    connectors: [
      {
        tariffInrPerKwh: 12,
        type: "TYPE2" as const,
        powerKw: 3.3,
        status: "offline" as const,
      },
    ],
  },
];
afterEach(cleanup);
it("filters each connector, speed, operator and availability and sorts distances", () => {
  expect(
    filterStations(stations, DEFAULT_FILTERS).map((item) => item.id),
  ).toEqual(["two", "one"]);
  for (const connector of ["CCS2", "CHADEMO"] as const)
    expect(
      filterStations(stations, { ...DEFAULT_FILTERS, connector }),
    ).toHaveLength(1);
  expect(
    filterStations(stations, { ...DEFAULT_FILTERS, connector: "TYPE2" }),
  ).toHaveLength(2);
  expect(
    filterStations(stations, { ...DEFAULT_FILTERS, speed: "ac" }),
  ).toHaveLength(2);
  for (const speed of ["fast", "ultra"] as const)
    expect(
      filterStations(stations, { ...DEFAULT_FILTERS, speed }),
    ).toHaveLength(1);
  expect(
    filterStations(stations, { ...DEFAULT_FILTERS, network: "zeon" }),
  ).toHaveLength(1);
  expect(
    filterStations(stations, { ...DEFAULT_FILTERS, availableOnly: true }),
  ).toHaveLength(1);
  expect(
    filterStations(stations, {
      ...DEFAULT_FILTERS,
      connector: "TYPE2",
      availableOnly: true,
    }),
  ).toEqual([]);
  expect(filterStations([], DEFAULT_FILTERS)).toEqual([]);
});
it("renders hostile station names as text, safe navigation URLs and status colors", () => {
  const onClose = vi.fn();
  const { container } = render(
    <StationDrawer station={station} onClose={onClose} />,
  );
  expect(
    screen.getByRole("heading", { name: station.name }),
  ).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
  const google = screen.getByRole("link", { name: /Google Maps/ });
  expect(google).toHaveAttribute(
    "href",
    "https://www.google.com/maps/dir/?api=1&destination=17.385%2C78.4867",
  );
  expect(google).toHaveAttribute("rel", "noopener noreferrer");
  expect(google).toHaveAttribute("target", "_blank");
  expect(screen.getByRole("link", { name: /Apple Maps/ })).toHaveAttribute(
    "href",
    "https://maps.apple.com/?daddr=17.385%2C78.4867",
  );
  expect(screen.getByLabelText("available")).toHaveStyle({
    backgroundColor: "#10B981",
  });
  expect(screen.getByLabelText("busy")).toHaveStyle({
    backgroundColor: "#F59E0B",
  });
  expect(screen.getByLabelText("offline")).toHaveStyle({
    backgroundColor: "#EF4444",
  });
  expect(screen.getByText("Tariff n/a")).toBeInTheDocument();
  expect(screen.getByText("CCS2 · 60 kW")).toBeInTheDocument();
  expect(screen.getByText("Type 2 · 11 kW")).toBeInTheDocument();
  expect(screen.getByText("CHAdeMO · 120 kW")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Reserve/ })).toBeDisabled();
  fireEvent.keyDown(window, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Back to stations" }));
  expect(onClose).toHaveBeenCalledTimes(2);
});
it("selects pins and list rows without a nested sheet handle", () => {
  const onSelect = vi.fn();
  render(
    <>
      <StationPin station={station} onSelect={onSelect} />
      <StationList stations={[station]} onSelect={onSelect} />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: /1 of 3 ports/ }));
  fireEvent.click(screen.getByRole("button", { name: /Statiq/ }));
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("slider")).toBeNull();
  expect(stationSummary({ ...station, connectors: [busyPort] }).status).toBe(
    "busy",
  );
  expect(stationSummary({ ...station, connectors: [] }).status).toBe("offline");
});
it.each([
  {
    radiusKm: 5,
    area: false,
    message: "No chargers match within 5 km. Try 10 km or adjust your filters.",
  },
  {
    radiusKm: 10,
    area: false,
    message:
      "No chargers match within 10 km. Try 20 km or adjust your filters.",
  },
  {
    radiusKm: 20,
    area: false,
    message:
      "No chargers match within 20 km. Try zooming out or moving the map.",
  },
  {
    radiusKm: 2,
    area: true,
    message:
      "No chargers match in this area. Try zooming out or moving the map.",
  },
])(
  "offers contextual empty-list guidance at $radiusKm km (area: $area)",
  ({ radiusKm, area, message }) => {
    render(
      <StationList
        stations={[]}
        onSelect={vi.fn()}
        radiusKm={radiusKm}
        area={area}
      />,
    );
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByText(/Local demo data/)).toBeInTheDocument();
  },
);
it("hides empty guidance during loading and after stations arrive", () => {
  const props = { stations: [], onSelect: vi.fn(), radiusKm: 5 };
  const { rerender } = render(<StationList {...props} loading />);
  expect(screen.queryByText(/No chargers match/)).toBeNull();
  rerender(<StationList {...props} stations={[station]} />);
  expect(screen.queryByText(/No chargers match/)).toBeNull();
});
it("updates all filter controls", () => {
  const onChange = vi.fn();
  render(<FilterBar filters={DEFAULT_FILTERS} onChange={onChange} expanded />);
  for (const name of ["CCS2", "Type 2", "CHAdeMO"]) {
    expect(screen.getByRole("option", { name })).toBeInTheDocument();
  }
  fireEvent.change(screen.getByLabelText("Connector"), {
    target: { value: "CCS2" },
  });
  fireEvent.change(screen.getByLabelText("Speed"), {
    target: { value: "ultra" },
  });
  fireEvent.change(screen.getByLabelText("Network operator"), {
    target: { value: "zeon" },
  });
  fireEvent.click(screen.getByLabelText("Available Now"));
  expect(onChange.mock.calls.map((call) => call[0])).toEqual([
    { ...DEFAULT_FILTERS, connector: "CCS2" },
    { ...DEFAULT_FILTERS, speed: "ultra", minimumPowerKw: 0 },
    { ...DEFAULT_FILTERS, network: "zeon" },
    { ...DEFAULT_FILTERS, availableOnly: true },
  ]);
});
it("selects named locations and current position", () => {
  const onSelect = vi.fn();
  const onCurrent = vi.fn();
  render(
    <LocationPresets
      value="Hyderabad"
      onSelect={onSelect}
      onCurrent={onCurrent}
    />,
  );
  fireEvent.change(screen.getByLabelText("Search area"), {
    target: { value: "Chennai" },
  });
  expect(onSelect).toHaveBeenCalledWith(
    { lat: 13.0827, lng: 80.2707 },
    "Chennai",
  );
  fireEvent.change(screen.getByLabelText("Search area"), {
    target: { value: "Current location" },
  });
  expect(onCurrent).toHaveBeenCalledOnce();
});
