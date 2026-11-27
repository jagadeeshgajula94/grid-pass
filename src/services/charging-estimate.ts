import type { EvPack } from "../domain/ev-catalogue";
import type { WaitEstimate } from "../domain/recommendation";
import type { ConnectorDto, StationDto } from "../domain/station";
export interface PortEstimate {
  free: number;
  compatible: number;
  powerKw: number;
  wait: WaitEstimate;
}
function acceptedPower(port: ConnectorDto, pack: EvPack): number {
  if (port.type === "CCS2") return Math.min(port.powerKw, pack.maxDcKw);
  if (port.type === "TYPE2") return Math.min(port.powerKw, pack.maxAcKw);
  return 0;
}
export function estimatePorts(
  station: StationDto,
  pack: EvPack,
): PortEstimate | null {
  const compatible = station.connectors.filter(
    (port) => port.status !== "offline" && acceptedPower(port, pack) > 0,
  );
  if (!compatible.length) return null;
  const free = compatible.filter((port) => port.status === "available");
  const unknown = compatible.filter((port) => port.status === "unknown");
  let chosen = compatible;
  let availability: WaitEstimate["availability"] = "busy";
  let minutes = 30 / compatible.length;
  if (free.length) {
    chosen = free;
    availability = "free";
    minutes = 0;
  } else if (unknown.length) {
    chosen = unknown;
    availability = "unknown";
    minutes = 10;
  }
  return {
    free: free.length,
    compatible: compatible.length,
    powerKw: Math.max(...chosen.map((port) => acceptedPower(port, pack))),
    wait: { minutes, availability, estimated: true, unverified: true },
  };
}
export function chargingMinutes(
  pack: EvPack,
  arrivalPercent: number,
  powerKw: number,
): number {
  return (
    ((Math.max(0, 0.8 - arrivalPercent / 100) * pack.nominalKwh) / powerKw) *
    1.1 *
    60
  );
}
export function waitDescription(ports: PortEstimate): string {
  if (ports.wait.availability === "free")
    return `${ports.free} of ${ports.compatible} compatible ports free`;
  if (ports.wait.availability === "unknown")
    return "availability unknown (unverified)";
  return `busy, est. ~${Math.ceil(ports.wait.minutes)} min wait (unverified)`;
}
