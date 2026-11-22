import { useEffect, useState } from "react";
import type { StationDto } from "../../domain/station";
import type { Point } from "../../lib/geo";
import { fetchStations } from "./stations-client";
interface StationState {
  stations: StationDto[];
  loading: boolean;
  error: string;
}
export function useStations({ lat, lng }: Point): StationState {
  const [state, setState] = useState<StationState>({
    stations: [],
    loading: true,
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ stations: [], loading: true, error: "" });
    void fetchStations({ lat, lng }, controller.signal).then((result) => {
      if (!controller.signal.aborted)
        setState({
          stations: result.ok ? result.value : [],
          error: result.ok ? "" : result.error,
          loading: false,
        });
    });
    return (): void => controller.abort();
  }, [lat, lng]);
  return state;
}
