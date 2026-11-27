import type {
  RecommendationContext,
  RecommendationDto,
} from "../domain/recommendation";
import type { RangeEstimate } from "./range.service";
export function emptyRecommendationMessage(
  nearestKm: number,
  range: RangeEstimate,
): string {
  if (!Number.isFinite(nearestKm))
    return "No compatible chargers here. Try a wider radius, route buffer or move the map.";
  return `Nearest charger ~${Math.round(nearestKm)} km, you have ~${Math.round(range.reachableRangeKm)} km: call roadside assistance.`;
}
export function routeMessage(
  context: RecommendationContext,
  distanceKm: number,
  arrival: number,
  result: RecommendationDto,
): string {
  const name =
    context.mode === "route"
      ? (context.destinationName ?? "Your destination")
      : "Your destination";
  if (arrival >= 10) {
    const advice = result.recommendations.length
      ? "optional stops below"
      : "no charging stop needed";
    return `Reach ${name} with ~${Math.floor(arrival)}% left; ${advice}`;
  }
  if (!result.recommendations.length)
    return "No reachable stop on this route; charge before leaving or call assistance.";
  return `${name} is ~${Math.round(distanceKm)} km, you have ~${Math.round(result.comfortableRangeKm)} km with reserve: charge at one of these`;
}
