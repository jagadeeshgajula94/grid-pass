import type { ReactElement } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { StationDto } from "../../domain/station";
import { StationMarkers } from "./StationMarkers";

export function CorridorMarkers(props: {
  map: MapLibreMap;
  stations: StationDto[];
  onSelect: (station: StationDto) => void;
}): ReactElement {
  return <StationMarkers {...props} numbered />;
}
