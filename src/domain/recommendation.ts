import type { EvModel } from "./ev-models";
import type { StationDto } from "./station";
import type { Point } from "../lib/geo";
export type RecommendationContext =
  | {
      mode: "route";
      origin: Point;
      destination: Point;
      destinationName?: string;
      bufferKm: number;
    }
  | { mode: "area" | "nearby"; center: Point; radiusKm: number };
export interface RecommendationRequest {
  batteryPercent: number;
  evModel?: EvModel;
  context: RecommendationContext;
}
export interface ChargingRecommendation {
  station: StationDto;
  availableConnectors: number;
  effectivePowerKw: number;
  arrivalPercent: number;
  chargeMinutes: number;
  roadDistanceKm: number;
  reason: string;
}
export interface RecommendationDto {
  evModel: EvModel;
  batteryPercent: number;
  contextMode: RecommendationContext["mode"];
  usableRangeKm: number;
  reachableRangeKm: number;
  approximateRoadDistances: boolean;
  recommendations: ChargingRecommendation[];
  message: string;
  routeMessage?: string;
}
