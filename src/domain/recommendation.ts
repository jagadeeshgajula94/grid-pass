import type { EvModel } from "./ev-catalogue";
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
  variantId?: string;
  carPosition: Point;
  positionSource: "gps" | "route" | "assumed";
  context: RecommendationContext;
}
export interface WaitEstimate {
  minutes: number;
  estimated: true;
  unverified: true;
  availability: "free" | "busy" | "unknown";
}
export interface ChargingRecommendation {
  station: StationDto;
  availableConnectors: number;
  effectivePowerKw: number;
  arrivalPercent: number;
  chargeMinutes: number;
  roadDistanceKm: number;
  tier: "A" | "B";
  wait: WaitEstimate;
  reason: string;
}
export interface RecommendationDto {
  evModel: EvModel;
  batteryPercent: number;
  contextMode: RecommendationContext["mode"];
  usableRangeKm: number;
  reachableRangeKm: number;
  approximateRoadDistances: boolean;
  variantId: string;
  packConfirmed: boolean;
  packMessage?: string;
  carPosition: Point;
  positionSource: RecommendationRequest["positionSource"];
  consumptionWhPerKm: number;
  comfortableRangeKm: number;
  tier: "A" | "B" | null;
  recommendations: ChargingRecommendation[];
  message: string;
  routeMessage?: string;
}
