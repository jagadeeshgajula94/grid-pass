const RANGES = new Map<string, number>([
  ["Mahindra XUV 9e", 500],
  ["Tata Nexon EV", 325],
  ["MG ZS EV", 350],
  ["Hyundai Ioniq 5", 480],
  ["BYD Atto 3", 420],
  ["Kia EV6", 450],
]);
export function rangeContext(evModel: string, distanceKm?: number): string {
  const range = RANGES.get(evModel);
  if (!range)
    return "Plan a charge stop · Range varies with driving conditions";
  if (distanceKm === undefined)
    return `${evModel} · ~${range} km estimated range`;
  return `Trip ${Math.round(distanceKm)} km · ${distanceKm <= range ? "within your" : "plan a charge stop for your"} ${evModel} range (~${range} km)`;
}
