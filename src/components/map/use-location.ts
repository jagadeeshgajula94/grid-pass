import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "../../lib/geo";
import { HYDERABAD } from "./LocationPresets";
interface SearchLocation {
  center: Point;
  location: string;
  status: string;
  resolved: boolean;
  choose: (point: Point, name: string) => void;
  locate: () => void;
}
export function useLocation(): SearchLocation {
  const [center, setCenter] = useState(HYDERABAD);
  const [location, setLocation] = useState("Hyderabad");
  const [status, setStatus] = useState("Locating you…");
  const [resolved, setResolved] = useState(false);
  const generation = useRef({ value: 0 });
  const choose = useCallback((point: Point, name: string): void => {
    generation.current.value++;
    setCenter(point);
    setLocation(name);
    setStatus(`Using ${name}`);
    setResolved(true);
  }, []);
  const locate = useCallback((): void => {
    const current = ++generation.current.value;
    setStatus("Locating you…");
    setResolved(false);
    const fallback = (): void => {
      if (current === generation.current.value) {
        choose(HYDERABAD, "Hyderabad");
        setStatus("Using Hyderabad — location unavailable");
      }
    };
    if (!navigator.geolocation) {
      fallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (current === generation.current.value)
          choose(
            { lat: position.coords.latitude, lng: position.coords.longitude },
            "Current location",
          );
      },
      fallback,
      { timeout: 5000, maximumAge: 60000 },
    );
  }, [choose]);
  useEffect(() => {
    const counter = generation.current;
    locate();
    return (): void => {
      counter.value++;
    };
  }, [locate]);
  return { center, location, status, resolved, choose, locate };
}
