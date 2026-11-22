import type { ReactElement } from "react";
import type { Point } from "../../lib/geo";
export const HYDERABAD: Point = { lat: 17.385, lng: 78.4867 };
const PRESETS = [
  { name: "Hyderabad", ...HYDERABAD },
  { name: "Vijayawada", lat: 16.5062, lng: 80.648 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Delhi NCR", lat: 28.6139, lng: 77.209 },
];
export function LocationPresets({
  value,
  onSelect,
  onCurrent,
}: {
  value: string;
  onSelect: (point: Point, name: string) => void;
  onCurrent: () => void;
}): ReactElement {
  return (
    <label className="location-select">
      Search area
      <select
        value={value}
        onChange={(event) => {
          if (event.target.value === "Current location") {
            onCurrent();
            return;
          }
          const preset = PRESETS.find(
            (item) => item.name === event.target.value,
          );
          if (preset)
            onSelect({ lat: preset.lat, lng: preset.lng }, preset.name);
        }}
      >
        <option>Current location</option>
        {PRESETS.map((preset) => (
          <option key={preset.name}>{preset.name}</option>
        ))}
      </select>
    </label>
  );
}
