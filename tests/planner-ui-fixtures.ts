import type { CorridorDto } from "../src/domain/route";
import type { StationDto } from "../src/domain/station";
export const plannerStation: StationDto = {
  id: "planner-station",
  name: "Highway Charge",
  network: "statiq",
  lat: 17.14,
  lng: 79.62,
  distanceKm: 1,
  address: "Suryapet NH65",
  amenities: [],
  lastUpdated: "2026-01-01T00:00:00.000Z",
  connectors: [
    { type: "CCS2", powerKw: 60, tariffInrPerKwh: 20, status: "available" },
  ],
};
export const destination = {
  id: "vijay",
  name: "Vijayawada",
  lat: 16.5062,
  lng: 80.648,
};
export const corridorFixture: CorridorDto = {
  route: {
    coordinates: [
      { lat: 17.385, lng: 78.4867 },
      { lat: destination.lat, lng: destination.lng },
    ],
    totalDistanceKm: 275,
    estimatedDurationMin: 300,
    fallback: false,
  },
  stations: [{ ...plannerStation, kmAlongRoute: 140, detourKm: 2 }],
  bufferKm: 5,
  sources: ["local"],
};
