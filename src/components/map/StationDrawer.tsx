import { useEffect, useRef, type ReactElement } from "react";
import { NETWORK_LABELS, type StationDto } from "../../domain/station";
import { NETWORK_BADGES } from "./station-display";
import { StationPorts } from "./StationPorts";
function navigationUrls(station: StationDto): {
  google: string;
  apple: string;
} {
  const coordinates = `${station.lat},${station.lng}`;
  const google = new URL("https://www.google.com/maps/dir/");
  google.search = new URLSearchParams({
    api: "1",
    destination: coordinates,
  }).toString();
  const apple = new URL("https://maps.apple.com/");
  apple.search = new URLSearchParams({ daddr: coordinates }).toString();
  return { google: google.href, apple: apple.href };
}
const AMENITIES = {
  restroom: "Restroom",
  cafe: "Cafe",
  dining: "Dining",
  wifi: "Wi-Fi",
};
function DrawerActions({ station }: { station: StationDto }): ReactElement {
  const links = navigationUrls(station);
  return (
    <>
      <div className="amenities">
        {station.amenities.map((amenity) => (
          <span key={amenity}>
            {Object.entries(AMENITIES).find(([key]) => key === amenity)?.[1]}
          </span>
        ))}
      </div>
      <h3>Navigate to station</h3>
      <div className="navigation-links">
        <a href={links.google} target="_blank" rel="noopener noreferrer">
          Google Maps ↗
        </a>
        <a href={links.apple} target="_blank" rel="noopener noreferrer">
          Apple Maps ↗
        </a>
      </div>
      <button className="reserve-button" disabled>
        Reserve &amp; Pay — V2
      </button>
      <p className="map-data-note">
        Check operator pricing and availability before travel.
      </p>
    </>
  );
}
function DrawerHeader({
  station,
  onClose,
}: {
  station: StationDto;
  onClose: () => void;
}): ReactElement {
  const close = useDrawerFocus(onClose);
  const badge = NETWORK_BADGES[station.network];
  return (
    <div className="drawer-top">
      <span className="operator-label">
        <span
          className="network-badge"
          style={{ backgroundColor: badge.color }}
        >
          {badge.short}
        </span>
        {NETWORK_LABELS[station.network]}
      </span>
      <button ref={close} onClick={onClose} aria-label="Close station details">
        ✕
      </button>
    </div>
  );
}
function useDrawerFocus(
  onClose: () => void,
): React.RefObject<HTMLButtonElement | null> {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    return (): void => {
      window.removeEventListener("keydown", escape);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose]);
  return close;
}
export function StationDrawer({
  station,
  onClose,
}: {
  station: StationDto;
  onClose: () => void;
}): ReactElement {
  return (
    <aside
      className="station-drawer glass"
      role="dialog"
      aria-labelledby="station-title"
    >
      <DrawerHeader station={station} onClose={onClose} />
      <h2 id="station-title">{station.name}</h2>
      <p className="distance-label">{station.distanceKm.toFixed(1)} km away</p>
      <p className="muted">{station.address}</p>
      <StationPorts station={station} />
      <DrawerActions station={station} />
    </aside>
  );
}
