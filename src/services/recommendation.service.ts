import { EV_SPECS, type EvSpec, type EvModel } from "../domain/ev-models";
import type {
  ChargingRecommendation,
  RecommendationDto,
  RecommendationRequest,
} from "../domain/recommendation";
import type { ConnectorDto, StationDto } from "../domain/station";
import { haversineKm } from "../lib/geo";
import { findNearby } from "./station.service";
import { findCorridor } from "./route.service";

export interface RecommendationCandidate {
  station: StationDto;
  roadDistanceKm: number;
  detourKm: number;
  progressKm: number;
}
type ResolvedRequest = RecommendationRequest & { evModel: EvModel };
interface ScoredRecommendation {
  recommendation: ChargingRecommendation;
  score: number;
}
const REAL_WORLD_FACTOR = 0.9;
const RESERVE_PERCENT = 10;
const ROUTE_PROGRESS_BONUS_MIN_PER_KM = 0.2;
function powerFor(connector: ConnectorDto, spec: EvSpec): number {
  if (connector.type === "CCS2")
    return Math.min(connector.powerKw, spec.maxDcKw);
  if (connector.type === "TYPE2")
    return Math.min(connector.powerKw, spec.maxAcKw);
  return 0;
}
function freeConnectors(station: StationDto, spec: EvSpec): ConnectorDto[] {
  return station.connectors.filter(
    (connector) =>
      connector.status === "available" && powerFor(connector, spec) > 0,
  );
}
function scoreCandidate(
  candidate: RecommendationCandidate,
  query: ResolvedRequest,
  spec: EvSpec,
): ScoredRecommendation | null {
  const free = freeConnectors(candidate.station, spec);
  const arrival =
    query.batteryPercent -
    (candidate.roadDistanceKm / (spec.ratedRangeKm * REAL_WORLD_FACTOR)) * 100;
  if (!free.length || arrival + 1e-9 < RESERVE_PERCENT) return null;
  const power = Math.max(...free.map((connector) => powerFor(connector, spec)));
  const chargeMinutes =
    ((spec.batteryKwh * Math.max(0, 0.8 - arrival / 100)) / power) * 1.1 * 60;
  const compatibleCount = candidate.station.connectors.filter(
    (connector) => powerFor(connector, spec) > 0,
  ).length;
  const travelMinutes =
    ((query.context.mode === "route"
      ? candidate.detourKm
      : candidate.roadDistanceKm) /
      30) *
    60;
  const bonus =
    query.context.mode === "route"
      ? candidate.progressKm * ROUTE_PROGRESS_BONUS_MIN_PER_KM
      : Math.min(free.length, 4) * 2;
  return {
    score: travelMinutes + chargeMinutes - bonus,
    recommendation: {
      station: candidate.station,
      availableConnectors: free.length,
      effectivePowerKw: power,
      arrivalPercent: Math.round(arrival),
      chargeMinutes: Math.ceil(chargeMinutes),
      roadDistanceKm: Math.round(candidate.roadDistanceKm * 10) / 10,
      reason: `${free.length} of ${compatibleCount} compatible ports free · ${power} kW · arrive with ~${Math.round(arrival)}% · ~${Math.ceil(chargeMinutes)} min to 80%`,
    },
  };
}
function emptyMessage(
  candidates: RecommendationCandidate[],
  spec: EvSpec,
  reachableRangeKm: number,
): string {
  const available = candidates.filter(
    ({ station }) => freeConnectors(station, spec).length,
  );
  if (!available.length)
    return "No available compatible chargers here. Try a wider radius, route buffer or another area.";
  const nearest = Math.min(
    ...available.map(({ roadDistanceKm }) => roadDistanceKm),
  );
  return `No charger is reachable with the 10% arrival reserve. Nearest free compatible charger is ~${Math.ceil(nearest)} km; you have ~${Math.floor(reachableRangeKm)} km with that reserve. Charge sooner or seek assistance.`;
}
export function rankRecommendations(
  candidates: RecommendationCandidate[],
  query: ResolvedRequest,
  approximateRoadDistances = true,
): RecommendationDto {
  const spec = EV_SPECS.get(query.evModel);
  if (!spec) throw new Error("Unsupported EV model");
  const usableRangeKm =
    ((spec.ratedRangeKm * query.batteryPercent) / 100) * REAL_WORLD_FACTOR;
  const reachableRangeKm =
    ((spec.ratedRangeKm * Math.max(0, query.batteryPercent - RESERVE_PERCENT)) /
      100) *
    REAL_WORLD_FACTOR;
  const recommendations = candidates
    .map((candidate) => scoreCandidate(candidate, query, spec))
    .filter((entry): entry is ScoredRecommendation => entry !== null)
    .sort(
      (a, b) =>
        a.score - b.score ||
        b.recommendation.effectivePowerKw - a.recommendation.effectivePowerKw ||
        a.recommendation.station.id.localeCompare(b.recommendation.station.id),
    )
    .slice(0, 3)
    .map(({ recommendation }) => recommendation);
  return {
    evModel: query.evModel,
    batteryPercent: query.batteryPercent,
    contextMode: query.context.mode,
    usableRangeKm: Math.round(usableRangeKm),
    reachableRangeKm: Math.floor(reachableRangeKm),
    approximateRoadDistances,
    recommendations,
    message: recommendations.length
      ? "Best charging options with a 10% arrival reserve"
      : emptyMessage(candidates, spec, reachableRangeKm),
  };
}
export async function recommendCharging(
  query: ResolvedRequest,
  requestId?: string,
): Promise<RecommendationDto> {
  const context = query.context;
  if (context.mode === "route") {
    const corridor = await findCorridor(
      {
        origin: context.origin,
        destination: context.destination,
        bufferKm: context.bufferKm,
      },
      requestId,
    );
    const factor = corridor.route.fallback ? 1.3 : 1;
    return rankRecommendations(
      corridor.stations.map((station) => ({
        station,
        roadDistanceKm: (station.kmAlongRoute + station.detourKm) * factor,
        detourKm: station.detourKm * factor,
        progressKm: station.kmAlongRoute * factor,
      })),
      query,
      corridor.route.fallback,
    );
  }
  const nearby = await findNearby(
    { ...context.center, radiusKm: context.radiusKm },
    requestId,
  );
  return rankRecommendations(
    nearby.stations.map((station) => ({
      station,
      roadDistanceKm: haversineKm(context.center, station) * 1.3,
      detourKm: 0,
      progressKm: 0,
    })),
    query,
  );
}
