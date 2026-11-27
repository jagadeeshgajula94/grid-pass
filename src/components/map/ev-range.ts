import { findPack, legacyPack } from "../../domain/ev-catalogue";
import { estimateRange } from "../../domain/range";
export function rangeContext(
  evModel: string,
  distanceKm?: number,
  fallback = false,
  accountPack?: { variantId?: string; packConfirmed?: boolean },
  durationMin?: number,
): string {
  if (!evModel) return "Sign in to see range for your EV";
  if (fallback && distanceKm !== undefined)
    return `Approximate straight-line ${Math.round(distanceKm)} km · Road distance unavailable · Plan charging conservatively`;
  const legacy = legacyPack(evModel)?.pack;
  const confirmed = accountPack?.packConfirmed
    ? findPack(accountPack.variantId ?? "")
    : undefined;
  const spec = confirmed?.model === legacy?.model ? confirmed : legacy;
  if (!spec) return "Plan a charge stop · Range varies with driving conditions";
  const range = estimateRange(
    spec,
    100,
    plannerSpeed(distanceKm, durationMin),
  ).reachableRangeKm;
  const label = `~${Math.floor(range)} km at full charge, conservative`;
  if (distanceKm === undefined) return `${evModel} · ${label}`;
  return `Trip ${Math.round(distanceKm)} km · ${distanceKm <= range ? "within your" : "plan a charge stop for your"} ${evModel} range (${label})`;
}
function plannerSpeed(distanceKm?: number, durationMin?: number): number {
  if (
    distanceKm === undefined ||
    durationMin === undefined ||
    durationMin <= 0 ||
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(durationMin)
  )
    return 80;
  return (distanceKm / durationMin) * 60;
}
