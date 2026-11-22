import { useState } from "react";
import type { PlaceDto } from "../../domain/route";
import type { useLocation } from "./use-location";
import type { PlannerProps } from "./RoutePlanner";
type PlannerState = Omit<PlannerProps, "evModel" | "route">;
export function useRoutePlanner(
  search: ReturnType<typeof useLocation>,
): PlannerState {
  const [destination, setDestination] = useState<PlaceDto | null>(null);
  const hint = search.status.includes("location unavailable")
    ? " — location unavailable"
    : "";
  const originName = search.resolved
    ? `${search.location}${hint}`
    : "Locating you…";
  const [bufferKm, setBuffer] = useState(5);
  const onOrigin = (place: PlaceDto): void => {
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
        name: search.location,
        ...search.center,
      });
      onOrigin(destination);
    },
  };
}
