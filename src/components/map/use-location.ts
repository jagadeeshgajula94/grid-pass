import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "../../lib/geo";
import { HYDERABAD } from "./LocationPresets";

export type LocationErrorKind =
  "denied" | "unavailable" | "timeout" | "unsupported";
interface LocationState {
  center: Point;
  position: Point | null;
  accuracy: number | null;
  errorKind: LocationErrorKind | null;
  location: string;
  status: string;
  resolved: boolean;
}
interface SearchLocation extends LocationState {
  choose: (point: Point, name: string) => void;
  locate: () => void;
  retry: () => void;
}
interface PositionRequest {
  generation: number;
  watch: number | null;
  accuracy: number;
  fixed: boolean;
}
type UpdateLocation = (update: (state: LocationState) => LocationState) => void;
const POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};
function stopWatch(request: PositionRequest): void {
  if (request.watch !== null)
    navigator.geolocation?.clearWatch?.(request.watch);
  request.watch = null;
}
function failedLocation(
  state: LocationState,
  errorKind: LocationErrorKind,
  following: boolean,
): LocationState {
  return {
    ...state,
    position: null,
    accuracy: null,
    errorKind,
    resolved: true,
    ...(following
      ? {
          center: HYDERABAD,
          location: "Hyderabad",
          status: "Using Hyderabad — location unavailable",
        }
      : {}),
  };
}
function positionCallback(
  request: PositionRequest,
  update: UpdateLocation,
  following: { current: boolean },
): PositionCallback {
  const generation = request.generation;
  return (position): void => {
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    const metres = Number.isFinite(accuracy) ? accuracy : Infinity;
    if (
      generation !== request.generation ||
      (request.fixed && metres >= request.accuracy)
    )
      return;
    request.fixed = true;
    request.accuracy = metres;
    update((state) => ({
      ...state,
      position: { lat, lng },
      accuracy: Number.isFinite(metres) ? metres : null,
      errorKind: null,
      resolved: true,
      ...(following.current
        ? {
            center: { lat, lng },
            location: "Current location",
            status: "Using current location",
          }
        : {}),
    }));
  };
}
function errorKind(code: number): LocationErrorKind {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}
function startLocation(
  request: PositionRequest,
  update: UpdateLocation,
  following: { current: boolean },
): void {
  stopWatch(request);
  const generation = ++request.generation;
  request.fixed = false;
  request.accuracy = Infinity;
  update((state) => ({
    ...state,
    status: "Locating you…",
    resolved: false,
    errorKind: null,
  }));
  if (!navigator.geolocation) {
    update((state) => failedLocation(state, "unsupported", following.current));
    return;
  }
  const accept = positionCallback(request, update, following);
  const fail = (error: GeolocationPositionError): void => {
    if (generation !== request.generation || request.fixed) return;
    const kind = errorKind(error.code);
    update((state) => failedLocation(state, kind, following.current));
  };
  navigator.geolocation.getCurrentPosition(accept, fail, POSITION_OPTIONS);
  request.watch =
    navigator.geolocation.watchPosition?.(accept, fail, POSITION_OPTIONS) ??
    null;
}
export function useLocation(): SearchLocation {
  const [state, setState] = useState<LocationState>({
    center: HYDERABAD,
    position: null,
    accuracy: null,
    errorKind: null,
    location: "Hyderabad",
    status: "Locating you…",
    resolved: false,
  });
  const request = useRef<PositionRequest>({
    generation: 0,
    watch: null,
    accuracy: Infinity,
    fixed: false,
  });
  const following = useRef(true);
  const locate = useCallback((): void => {
    following.current = true;
    startLocation(request.current, setState, following);
  }, []);
  useEffect(() => {
    const current = request.current;
    locate();
    return (): void => {
      current.generation++;
      stopWatch(current);
    };
  }, [locate]);
  const choose = useCallback((center: Point, location: string): void => {
    following.current = false;
    setState((previous) => ({
      ...previous,
      center,
      location,
      status: `Using ${location}`,
      resolved: true,
    }));
  }, []);
  return { ...state, choose, locate, retry: locate };
}
