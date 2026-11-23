import type {
  RecommendationContext,
  RecommendationDto,
} from "../src/domain/recommendation";
import { plannerStation } from "./planner-ui-fixtures";
export const NEXON = "Tata Nexon EV";
export const assistantCenter = { lat: 17.517, lng: 78.385 };
export const nearbyContext = {
  mode: "nearby",
  center: assistantCenter,
  radiusKm: 5,
} satisfies RecommendationContext;
export const assistantResponse: RecommendationDto = {
  evModel: NEXON,
  batteryPercent: 35,
  contextMode: "nearby",
  usableRangeKm: 146,
  reachableRangeKm: 104,
  approximateRoadDistances: true,
  message: "Best charging options with a 10% arrival reserve",
  recommendations: [
    {
      station: { ...plannerStation, ...assistantCenter },
      availableConnectors: 1,
      effectivePowerKw: 60,
      arrivalPercent: 34,
      chargeMinutes: 21,
      roadDistanceKm: 2,
      reason:
        "1 of 1 compatible ports free · 60 kW · arrive with ~34% · ~21 min to 80%",
    },
  ],
};
