import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import type { StationDto } from "../../domain/station";
function CorridorMarker({
  map,
  station,
  number,
  onSelect,
}: {
  map: MapLibreMap;
  station: StationDto;
  number: number;
  onSelect: (station: StationDto) => void;
}): ReactElement {
  const [element] = useState(() => document.createElement("div"));
  useEffect(() => {
    const marker = new Marker({ element })
      .setLngLat([station.lng, station.lat])
      .addTo(map);
    return (): void => {
      marker.remove();
    };
  }, [map, station, element]);
  return createPortal(
    <button
      className="corridor-marker"
      onClick={() => onSelect(station)}
      aria-label={`Stop ${number}: ${station.name}`}
    >
      {number}
    </button>,
    element,
  );
}
export function CorridorMarkers({
  map,
  stations,
  onSelect,
}: {
  map: MapLibreMap;
  stations: StationDto[];
  onSelect: (station: StationDto) => void;
}): ReactElement {
  return (
    <>
      {stations.map((station, index) => (
        <CorridorMarker
          key={station.id}
          map={map}
          station={station}
          number={index + 1}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
