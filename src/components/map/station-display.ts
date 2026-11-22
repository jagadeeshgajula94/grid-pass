import type { ConnectorDto, Network, StationDto } from "../../domain/station";
export function connectorLabel(type: ConnectorDto["type"]): string {
  switch (type) {
    case "TYPE2":
      return "Type 2";
    case "CHADEMO":
      return "CHAdeMO";
    default:
      return "CCS2";
  }
}
export const NETWORK_BADGES: Record<Network, { short: string; color: string }> =
  {
    "tata-power": { short: "TP", color: "#3b82f6" },
    statiq: { short: "ST", color: "#a78bfa" },
    zeon: { short: "ZE", color: "#f97316" },
    chargezone: { short: "CZ", color: "#ef4444" },
    "jio-bp": { short: "JB", color: "#06b6d4" },
    "ather-grid": { short: "AG", color: "#84cc16" },
    other: { short: "EV", color: "#94a3b8" },
  };
export const STATUS_COLORS = {
  available: "#10B981",
  busy: "#F59E0B",
  offline: "#EF4444",
};
export function stationSummary(station: StationDto): {
  available: number;
  total: number;
  power: number;
  status: keyof typeof STATUS_COLORS;
} {
  const available = station.connectors.filter(
    (port) => port.status === "available",
  ).length;
  const status = station.connectors.some((port) => port.status === "busy")
    ? "busy"
    : "offline";
  return {
    available,
    total: station.connectors.length,
    power: Math.max(0, ...station.connectors.map((port) => port.powerKw)),
    status: available ? "available" : status,
  };
}
