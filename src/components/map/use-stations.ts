import { useEffect, useRef, useState } from "react";
import type { StationDto } from "../../domain/station";
import type { Point } from "../../lib/geo";
import { fetchStations } from "./stations-client";
export interface StationState {
  stations: StationDto[];
  loading: boolean;
  error: string;
}
interface CachedStations {
  stations: StationDto[];
  expires: number;
}
function cacheKey(center: Point, radiusKm: number): string {
  return `${center.lat.toFixed(3)}:${center.lng.toFixed(3)}:${radiusKm.toFixed(1)}`;
}
function cacheStations(
  cache: Map<string, CachedStations>,
  key: string,
  stations: StationDto[],
): void {
  if (cache.size >= 20) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { stations, expires: Date.now() + 60_000 });
}
function receivedStations(
  result: Awaited<ReturnType<typeof fetchStations>>,
  cache: Map<string, CachedStations>,
  key: string,
): StationState {
  const stations = result.ok ? (result.value ?? []) : [];
  if (result.ok && result.value) cacheStations(cache, key, stations);
  return {
    stations,
    error: result.ok ? "" : result.error.message,
    loading: false,
  };
}
export function useStations(
  center: Point,
  enabled = true,
  radiusKm = 5,
  debounceMs = 0,
): StationState {
  const { lat, lng } = center;
  const [state, setState] = useState<StationState>({
    stations: [],
    loading: true,
    error: "",
  });
  const cache = useRef(new Map<string, CachedStations>());
  const lastRequest = useRef(-Infinity);
  useEffect(() => {
    if (!enabled) {
      setState({ stations: [], loading: false, error: "" });
      return;
    }
    const key = cacheKey({ lat, lng }, radiusKm);
    const cached = cache.current.get(key);
    if (cached && cached.expires > Date.now()) {
      setState({ stations: cached.stations, loading: false, error: "" });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    const load = (): void => {
      lastRequest.current = Date.now();
      void fetchStations({ lat, lng }, controller.signal, radiusKm).then(
        (result) => {
          if (controller.signal.aborted) return;
          setState(receivedStations(result, cache.current, key));
        },
      );
    };
    const delay = debounceMs
      ? Math.max(debounceMs, 1500 - (Date.now() - lastRequest.current))
      : 0;
    const timer = delay ? setTimeout(load, delay) : undefined;
    if (!delay) load();
    return (): void => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [lat, lng, enabled, radiusKm, debounceMs]);
  return state;
}
