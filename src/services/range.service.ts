import type { EvPack } from "../domain/ev-catalogue";

export interface RangeEstimate {
  energyKwh: number;
  consumptionWhPerKm: number;
  rangeKm: number;
  reachableRangeKm: number;
  comfortableRangeKm: number;
}
export function effectiveConsumption(pack: EvPack, speedKph = 40): number {
  const speed = Math.max(0, Math.min(120, speedKph));
  const mix = Math.max(0, Math.min(1, (speed - 40) / 40));
  const base =
    pack.cityWhPerKm + (pack.highwayWhPerKm - pack.cityWhPerKm) * mix;
  return base * (1 + 0.02 * Math.max(0, speed - 80)) * 1.1;
}
export function estimateRange(
  pack: EvPack,
  batteryPercent: number,
  speedKph = 40,
): RangeEstimate {
  const energyKwh = (batteryPercent / 100) * pack.nominalKwh;
  const consumptionWhPerKm = effectiveConsumption(pack, speedKph);
  const rangeKm = (1000 * energyKwh) / consumptionWhPerKm;
  return {
    energyKwh,
    consumptionWhPerKm,
    rangeKm,
    reachableRangeKm: 0.9 * rangeKm,
    comfortableRangeKm:
      (((1000 * Math.max(0, batteryPercent - 10)) / 100) * pack.nominalKwh) /
      consumptionWhPerKm,
  };
}
export function predictedArrival(
  pack: EvPack,
  batteryPercent: number,
  distanceKm: number,
  consumptionWhPerKm: number,
): number {
  return (
    batteryPercent -
    (100 * distanceKm * consumptionWhPerKm) / (1000 * pack.nominalKwh)
  );
}
