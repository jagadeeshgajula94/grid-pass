import type { StationDto } from "./station";
import type { Point } from "../lib/geo";
export interface PlaceDto extends Point {
  id: string;
  name: string;
}
export interface CorridorStationDto extends StationDto {
  kmAlongRoute: number;
  detourKm: number;
}
export interface RouteSummaryDto {
  coordinates: Point[];
  totalDistanceKm: number;
  estimatedDurationMin: number;
  fallback: boolean;
}
export interface CorridorDto {
  route: RouteSummaryDto;
  stations: CorridorStationDto[];
  bufferKm: number;
  sources: string[];
}
