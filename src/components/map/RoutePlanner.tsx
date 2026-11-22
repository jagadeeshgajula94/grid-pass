import type { ReactElement } from "react";
import type { PlaceDto, RouteSummaryDto } from "../../domain/route";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { rangeContext } from "./ev-range";
export interface PlannerProps {
  originName: string;
  destination: PlaceDto | null;
  bufferKm: number;
  evModel: string;
  route?: RouteSummaryDto;
  onOrigin: (place: PlaceDto) => void;
  onDestination: (place: PlaceDto) => void;
  onSwap: () => void;
  onClear: () => void;
  onBuffer: (buffer: number) => void;
  onCurrent: () => void;
}
function PlannerInputs(props: PlannerProps): ReactElement {
  return (
    <div className="planner-inputs">
      <PlaceAutocomplete
        label="Origin"
        value={props.originName}
        onSelect={props.onOrigin}
      />
      <button
        className="planner-icon"
        onClick={props.onSwap}
        disabled={!props.destination}
        aria-label="Swap origin and destination"
      >
        ⇄
      </button>
      <PlaceAutocomplete
        label="Destination"
        value={props.destination?.name ?? ""}
        onSelect={props.onDestination}
      />
    </div>
  );
}
function PlannerActions(props: PlannerProps): ReactElement {
  return (
    <div className="planner-actions">
      <button onClick={props.onCurrent}>◎ Current location</button>
      <div className="buffer-toggle" role="group" aria-label="Corridor buffer">
        {[2, 5, 10].map((buffer) => (
          <button
            key={buffer}
            aria-pressed={props.bufferKm === buffer}
            onClick={() => props.onBuffer(buffer)}
          >
            {buffer} km
          </button>
        ))}
      </div>
      {props.destination && (
        <button onClick={props.onClear}>Clear Route ×</button>
      )}
    </div>
  );
}
export function RoutePlanner(props: PlannerProps): ReactElement {
  return (
    <section className="route-planner glass" aria-label="Route planner">
      <div className="planner-heading">
        <span>
          {props.destination ? "02 / ROUTE CORRIDOR" : "01 / NEARBY RADAR"}
        </span>
        <span>INDIA / EV NETWORK</span>
      </div>
      <PlannerInputs {...props} />
      <PlannerActions {...props} />
      <p className="range-context">
        {rangeContext(
          props.evModel,
          props.route?.totalDistanceKm,
          props.route?.fallback,
        )}
      </p>
      {props.route && (
        <p className="route-summary">
          {Math.round(props.route.totalDistanceKm)} km <span> / </span>
          {Math.round(props.route.estimatedDurationMin)} min ·{" "}
          {props.route.fallback
            ? "Approximate route · roads unavailable"
            : "Driving route"}
        </p>
      )}
    </section>
  );
}
