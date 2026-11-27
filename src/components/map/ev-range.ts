import { legacyPack } from "../../domain/ev-catalogue";
export function rangeContext(
  evModel: string,
  distanceKm?: number,
  fallback = false,
): string {
  if (!evModel) return "Sign in to see range for your EV";
  if (fallback && distanceKm !== undefined)
    return `Approximate straight-line ${Math.round(distanceKm)} km · Road distance unavailable · Plan charging conservatively`;
  const spec = legacyPack(evModel)?.pack;
  if (!spec) return "Plan a charge stop · Range varies with driving conditions";
  const range = Math.round(spec.claimedRangeKm * 0.9);
  if (distanceKm === undefined)
    return `${evModel} · ~${range} km estimated range`;
  return `Trip ${Math.round(distanceKm)} km · ${distanceKm <= range ? "within your" : "plan a charge stop for your"} ${evModel} range (~${range} km)`;
}
