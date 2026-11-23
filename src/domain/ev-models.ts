export const EV_MODELS = [
  "Mahindra XUV 9e",
  "Tata Nexon EV",
  "MG ZS EV",
  "Hyundai Ioniq 5",
  "BYD Atto 3",
  "Kia EV6",
] as const;
export type EvModel = (typeof EV_MODELS)[number];
export interface EvSpec {
  batteryKwh: number;
  ratedRangeKm: number;
  maxDcKw: number;
  maxAcKw: number;
}
// Approximate public Indian-market long-range variant figures (ARAI ranges), not live manufacturer data.
// XUV 9e is the app's legacy label for XEV 9e (79 kWh); other variants differ. Peak kW is not sustained.
export const EV_SPECS: ReadonlyMap<string, EvSpec> = new Map([
  [
    "Mahindra XUV 9e",
    { batteryKwh: 79, ratedRangeKm: 656, maxDcKw: 180, maxAcKw: 11 },
  ],
  [
    "Tata Nexon EV",
    { batteryKwh: 40.5, ratedRangeKm: 465, maxDcKw: 60, maxAcKw: 7.2 },
  ],
  [
    "MG ZS EV",
    { batteryKwh: 50.3, ratedRangeKm: 461, maxDcKw: 50, maxAcKw: 7.4 },
  ],
  [
    "Hyundai Ioniq 5",
    { batteryKwh: 72.6, ratedRangeKm: 631, maxDcKw: 220, maxAcKw: 11 },
  ],
  [
    "BYD Atto 3",
    { batteryKwh: 60.48, ratedRangeKm: 521, maxDcKw: 80, maxAcKw: 7 },
  ],
  [
    "Kia EV6",
    { batteryKwh: 77.4, ratedRangeKm: 708, maxDcKw: 240, maxAcKw: 11 },
  ],
]);
