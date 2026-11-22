import { useEffect, useState } from "react";
import type { PlaceDto } from "../../domain/route";
import { fetchPlaces } from "./route-client";
interface PlaceState {
  places: PlaceDto[];
  loading: boolean;
  error: string;
}
export function usePlaceSearch(query: string, enabled: boolean): PlaceState {
  const [state, setState] = useState<PlaceState>({
    places: [],
    loading: false,
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    const eligible = enabled && query.trim().length >= 2;
    setState({ places: [], loading: eligible, error: "" });
    const timer = setTimeout(() => {
      if (!eligible) return;
      void fetchPlaces(query.trim(), controller.signal).then((result) => {
        if (!controller.signal.aborted)
          setState({
            places: result.ok ? (result.value ?? []) : [],
            loading: false,
            error: result.ok ? "" : result.error.message,
          });
      });
    }, 250);
    return (): void => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);
  return state;
}
