export const NETWORKS = [
  "tata-power",
  "statiq",
  "zeon",
  "chargezone",
  "jio-bp",
  "ather-grid",
  "other",
] as const;
export type Network = (typeof NETWORKS)[number];
export const NETWORK_LABELS: Record<Network, string> = {
  "tata-power": "Tata Power",
  statiq: "Statiq",
  zeon: "Zeon",
  chargezone: "ChargeZone",
  "jio-bp": "Jio-bp",
  "ather-grid": "Ather Grid",
  other: "Other",
};
export const CONNECTORS = ["CCS2", "TYPE2", "CHADEMO"] as const;
export interface ConnectorDto {
  type: (typeof CONNECTORS)[number];
  powerKw: number;
  tariffInrPerKwh: number | null;
  status: "available" | "busy" | "offline";
}
export interface StationDto {
  id: string;
  name: string;
  network: Network;
  lat: number;
  lng: number;
  distanceKm: number;
  address: string;
  connectors: ConnectorDto[];
  amenities: ("restroom" | "cafe" | "dining" | "wifi")[];
  lastUpdated: string;
}
