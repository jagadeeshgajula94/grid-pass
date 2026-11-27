import { findPack, legacyPack } from "../../domain/ev-catalogue";
export function rangeContext(
  evModel: string,
  distanceKm?: number,
  fallback = false,
  accountPack?: { variantId?: string; packConfirmed?: boolean },
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
  const range = Math.round(spec.claimedRangeKm * 0.9);
  if (distanceKm === undefined)
    return `${evModel} · ~${range} km estimated range`;
  return `Trip ${Math.round(distanceKm)} km · ${distanceKm <= range ? "within your" : "plan a charge stop for your"} ${evModel} range (~${range} km)`;
}
