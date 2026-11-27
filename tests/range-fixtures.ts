import { vi } from "vitest";
import * as catalogue from "../src/domain/ev-catalogue";
import type { ConnectorDto } from "../src/domain/station";
import type { RecommendationRequest } from "../src/domain/recommendation";
import type { RecommendationCandidate } from "../src/services/recommendation.service";
import { assistantCenter, nearbyContext } from "./recommendation-fixtures";
import { plannerStation } from "./planner-ui-fixtures";
export const NEXON_45 = "tata-nexon-ev-45";
export const XEV_59 = "mahindra-xev-9e-59";
export const TIAGO_19 = "tata-tiago-ev-19.2";
export function packById(id = NEXON_45): catalogue.EvPack {
  const pack = catalogue.findPack(id);
  if (!pack) throw new Error("Missing test pack");
  return pack;
}
export function designPack(id = NEXON_45): catalogue.EvPack {
  const pack = packById(id);
  return id === NEXON_45
    ? { ...pack, cityWhPerKm: 120, highwayWhPerKm: 150 }
    : pack;
}
export function mockDesignPack(id = NEXON_45): catalogue.EvPack {
  const pack = designPack(id);
  vi.spyOn(catalogue, "selectPack").mockReturnValue({
    pack,
    packConfirmed: true,
  });
  return pack;
}
export function rangeQuery(
  batteryPercent = 35,
  variantId = NEXON_45,
): RecommendationRequest {
  return {
    batteryPercent,
    variantId,
    carPosition: assistantCenter,
    positionSource: "gps",
    context: nearbyContext,
  };
}
export const DC_PORT: ConnectorDto = {
  type: "CCS2",
  powerKw: 120,
  status: "available",
  tariffInrPerKwh: null,
};
export function candidate(
  id = "charger",
  distance = 5,
  connectors = [DC_PORT],
): RecommendationCandidate {
  return {
    station: { ...plannerStation, id, connectors },
    roadDistanceKm: distance,
    detourKm: 0,
    progressKm: distance,
  };
}
