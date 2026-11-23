import type { ReactElement } from "react";
import type { LocationErrorKind } from "./use-location";

const REASONS = new Map<LocationErrorKind, string>([
  ["denied", "Location permission blocked"],
  ["unavailable", "Location unavailable — check your device location settings"],
  ["timeout", "Location request timed out"],
  ["unsupported", "Location is not supported by this browser"],
]);
export function LocationBanner({
  errorKind,
  onRetry,
  onSearch,
}: {
  errorKind: LocationErrorKind | null;
  onRetry: () => void;
  onSearch: () => void;
}): ReactElement | null {
  if (!errorKind) return null;
  return (
    <section
      className="location-banner"
      role="status"
      aria-label="Location unavailable"
    >
      <strong>{REASONS.get(errorKind)}</strong>
      <p>
        Your location could not be confirmed. Browse the map or search your
        area.
      </p>
      <div>
        <button onClick={onRetry}>Try again</button>
        <button onClick={onSearch}>Search my area</button>
      </div>
    </section>
  );
}
