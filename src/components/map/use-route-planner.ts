import { useState } from "react";
import type { PlaceDto } from "../../domain/route";
import type { useLocation } from "./use-location";
import type { PlannerProps } from "./RoutePlanner";
type PlannerState = Omit<PlannerProps, "evModel" | "route">;
const CURRENT_LOCATION = "Current Location";
export function useRoutePlanner(
  search: ReturnType<typeof useLocation>,
): PlannerState {
  const [destination, setDestination] = useState<PlaceDto | null>(null);
  const [originName, setOriginName] = useState(CURRENT_LOCATION);
  const [bufferKm, setBuffer] = useState(5);
  const onOrigin = (place: PlaceDto): void => {
    setOriginName(place.name);
    search.choose(place, place.name);
  };
  return {
    originName,
    destination,
    bufferKm,
    onOrigin,
    onDestination: setDestination,
    onBuffer: setBuffer,
    onCurrent: (): void => {
      setOriginName(CURRENT_LOCATION);
      search.locate();
    },
    onClear: (): void => {
      setDestination(null);
      setBuffer(5);
    },
    onSwap: (): void => {
      if (!destination) return;
      setDestination({
        id: "previous-origin",
        name: originName === CURRENT_LOCATION ? search.location : originName,
        ...search.center,
      });
      onOrigin(destination);
    },
  };
}
