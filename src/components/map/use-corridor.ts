import { useEffect, useState } from "react";
import type { CorridorDto, PlaceDto } from "../../domain/route";
import type { Point } from "../../lib/geo";
import { fetchCorridor } from "./route-client";
interface CorridorState {
  data: CorridorDto | null;
  loading: boolean;
  error: string;
}
export function useCorridor(
  origin: Point,
  destination: PlaceDto | null,
  bufferKm: number,
): CorridorState {
  const [state, setState] = useState<CorridorState>({
    data: null,
    loading: false,
    error: "",
  });
  const { lat, lng } = origin;
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: !!destination, error: "" });
    if (destination)
      void fetchCorridor(
        {
          origin: { lat, lng },
          destination: { lat: destination.lat, lng: destination.lng },
          bufferKm,
        },
        controller.signal,
      ).then((result) => {
        if (!controller.signal.aborted)
          setState({
            data: result.ok ? result.value : null,
            loading: false,
            error: result.ok ? "" : result.error.message,
          });
      });
    return (): void => controller.abort();
  }, [lat, lng, destination, bufferKm]);
  return state;
}
