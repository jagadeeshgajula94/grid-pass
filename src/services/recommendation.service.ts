import {
  selectPack,
  type EvPack,
  type PackSelection,
} from "../domain/ev-catalogue";
import type {
  ChargingRecommendation,
  RecommendationDto,
  RecommendationRequest,
} from "../domain/recommendation";
import type { StationDto } from "../domain/station";
import { haversineKm, projectOntoPolyline } from "../lib/geo";
import { AppError } from "../lib/errors";
import { findNearby } from "./station.service";
import { findCorridor } from "./route.service";
import {
  chargingMinutes,
  estimatePorts,
  waitDescription,
} from "./charging-estimate";
import {
  estimateRange,
  predictedArrival,
  type RangeEstimate,
} from "./range.service";
import {
  emptyRecommendationMessage,
  routeMessage,
} from "./recommendation-messages";

export interface RecommendationCandidate {
  station: StationDto;
  roadDistanceKm: number;
  detourKm: number;
  progressKm: number;
}
export type ResolvedRequest = RecommendationRequest & {
  packConfirmed?: boolean;
};
interface ScoredRecommendation {
  recommendation: ChargingRecommendation;
  score: number;
  secondary: number;
}
function scoreCandidate(
  candidate: RecommendationCandidate,
  query: ResolvedRequest,
  pack: EvPack,
  range: RangeEstimate,
): ScoredRecommendation | null {
  const ports = estimatePorts(candidate.station, pack);
  if (
    !ports ||
    candidate.roadDistanceKm > range.reachableRangeKm ||
    candidate.roadDistanceKm < 0
  )
    return null;
  const arrival = predictedArrival(
    pack,
    query.batteryPercent,
    candidate.roadDistanceKm,
    range.consumptionWhPerKm,
  );
  const tier = arrival >= 10 ? "A" : "B";
  const charge = chargingMinutes(pack, arrival, ports.powerKw);
  const secondary = ports.wait.minutes + charge;
  const route = query.context.mode === "route";
  const travel = 2 * (route ? candidate.detourKm : candidate.roadDistanceKm);
  const bonus = route
    ? 0.2 * candidate.progressKm
    : 2 * Math.min(ports.free, 4);
  const displayArrival = Math.floor(arrival * 10) / 10;
  return {
    score: tier === "B" ? candidate.roadDistanceKm : travel + secondary - bonus,
    secondary: tier === "B" ? secondary : 0,
    recommendation: {
      station: candidate.station,
      availableConnectors: ports.free,
      effectivePowerKw: ports.powerKw,
      arrivalPercent: displayArrival,
      chargeMinutes: Math.round(charge),
      roadDistanceKm: candidate.roadDistanceKm,
      tier,
      wait: ports.wait,
      reason: `${tier === "B" ? "Low battery, go now · " : ""}${waitDescription(ports)} · ${ports.powerKw} kW · arrive ~${displayArrival}% · ~${Math.round(charge)} min to 80%`,
    },
  };
}
function compare(a: ScoredRecommendation, b: ScoredRecommendation): number {
  return (
    a.score - b.score ||
    a.secondary - b.secondary ||
    b.recommendation.effectivePowerKw - a.recommendation.effectivePowerKw ||
    a.recommendation.station.id.localeCompare(b.recommendation.station.id)
  );
}
function response(
  query: ResolvedRequest,
  selection: PackSelection,
  range: RangeEstimate,
  recommendations: ChargingRecommendation[],
  nearest: number,
  approximateRoadDistances: boolean,
): RecommendationDto {
  const tier = recommendations[0]?.tier ?? null;
  let message = emptyRecommendationMessage(nearest, range);
  if (tier === "A") message = "Best charging options · estimated arrival ≥10%";
  if (tier === "B")
    message =
      "Low battery, go now, drive gently. Arrival below 10%; figures are approximate.";
  return {
    evModel: selection.pack.model,
    batteryPercent: query.batteryPercent,
    contextMode: query.context.mode,
    variantId: selection.pack.id,
    packConfirmed: selection.packConfirmed,
    ...(!selection.packConfirmed
      ? { packMessage: "Confirm your battery pack" }
      : {}),
    carPosition: query.carPosition,
    positionSource: query.positionSource,
    consumptionWhPerKm: range.consumptionWhPerKm,
    comfortableRangeKm: range.comfortableRangeKm,
    usableRangeKm: range.rangeKm,
    reachableRangeKm: range.reachableRangeKm,
    approximateRoadDistances,
    tier,
    recommendations,
    message,
  };
}
export function rankRecommendations(
  candidates: RecommendationCandidate[],
  query: ResolvedRequest,
  approximateRoadDistances = true,
  speedKph = 40,
): RecommendationDto {
  const selection = selectPack(query);
  if (!selection)
    throw new AppError(
      "VALIDATION",
      "Choose a supported EV model and battery pack.",
    );
  const range = estimateRange(selection.pack, query.batteryPercent, speedKph);
  const eligible = candidates
    .map((candidate) => scoreCandidate(candidate, query, selection.pack, range))
    .filter((entry): entry is ScoredRecommendation => entry !== null);
  const comfortable = eligible.filter(
    (entry) => entry.recommendation.tier === "A",
  );
  const recommendations = (comfortable.length ? comfortable : eligible)
    .sort(compare)
    .slice(0, 3)
    .map((entry) => entry.recommendation);
  const compatible = candidates.filter(({ station }) =>
    estimatePorts(station, selection.pack),
  );
  const nearest = compatible.reduce(
    (distance, candidate) => Math.min(distance, candidate.roadDistanceKm),
    Infinity,
  );
  return response(
    query,
    selection,
    range,
    recommendations,
    nearest,
    approximateRoadDistances,
  );
}
async function recommendRoute(
  query: ResolvedRequest,
  context: Extract<RecommendationRequest["context"], { mode: "route" }>,
  requestId?: string,
): Promise<RecommendationDto> {
  const corridor = await findCorridor(
    {
      origin: context.origin,
      destination: context.destination,
      bufferKm: context.bufferKm,
    },
    requestId,
  );
  const factor = corridor.route.fallback ? 1.3 : 1;
  const car = projectOntoPolyline(
    query.carPosition,
    corridor.route.coordinates,
  );
  const candidates = corridor.stations.map((station) => ({
    station,
    roadDistanceKm:
      (Math.abs(station.kmAlongRoute - car.kmAlongRoute) + station.detourKm) *
        factor +
      car.distanceKm * 1.3,
    detourKm: station.detourKm * factor,
    progressKm: station.kmAlongRoute - car.kmAlongRoute,
  }));
  const speed =
    corridor.route.estimatedDurationMin > 0
      ? (corridor.route.totalDistanceKm / corridor.route.estimatedDurationMin) *
        60
      : 40;
  const result = rankRecommendations(
    candidates,
    query,
    corridor.route.fallback,
    speed,
  );
  const distance =
    Math.max(0, corridor.route.totalDistanceKm - car.kmAlongRoute) * factor +
    car.distanceKm * 1.3;
  return withRouteMessage(query, distance, result);
}
function withRouteMessage(
  query: ResolvedRequest,
  distance: number,
  result: RecommendationDto,
): RecommendationDto {
  const selection = selectPack(query);
  if (!selection) throw new AppError("VALIDATION", "Unsupported battery pack");
  const arrival = predictedArrival(
    selection.pack,
    query.batteryPercent,
    distance,
    result.consumptionWhPerKm,
  );
  return {
    ...result,
    message:
      arrival >= 10 && !result.recommendations.length
        ? "No charging stop needed for this route."
        : result.message,
    routeMessage: routeMessage(query.context, distance, arrival, result),
  };
}
export async function recommendCharging(
  query: ResolvedRequest,
  requestId?: string,
): Promise<RecommendationDto> {
  if (query.context.mode === "route")
    return recommendRoute(query, query.context, requestId);
  const context = query.context;
  const nearby = await findNearby(
    { ...context.center, radiusKm: context.radiusKm },
    requestId,
  );
  return rankRecommendations(
    nearby.stations.map((station) => ({
      station,
      roadDistanceKm: haversineKm(query.carPosition, station) * 1.3,
      detourKm: 0,
      progressKm: 0,
    })),
    query,
  );
}
