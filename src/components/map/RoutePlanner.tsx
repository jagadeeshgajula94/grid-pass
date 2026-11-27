import { useEffect, useRef, useState, type ReactElement } from "react";
import { Search, ArrowUpDown, ChevronUp } from "lucide-react";
import type { PlaceDto, RouteSummaryDto } from "../../domain/route";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { rangeContext } from "./ev-range";
export interface PlannerProps {
  searchRequest?: number;
  onSearchReady?: () => void;
  originName: string;
  destination: PlaceDto | null;
  bufferKm: number;
  evModel: string;
  accountPack?: { variantId?: string; packConfirmed?: boolean };
  route?: RouteSummaryDto;
  onOrigin: (place: PlaceDto) => void;
  onDestination: (place: PlaceDto) => void;
  onSwap: () => void;
  onClear: () => void;
  onBuffer: (buffer: number) => void;
  onCurrent: () => void;
  onExpand?: () => void;
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
        <ArrowUpDown size={18} />
      </button>
      <PlaceAutocomplete
        label="Destination"
        value={props.destination?.name ?? ""}
        onSelect={props.onDestination}
      />
    </div>
  );
}
function RouteSummary(
  props: PlannerProps & { onEdit: () => void },
): ReactElement {
  return (
    <>
      <div className="route-summary">
        <div>
          <strong>
            {props.route
              ? `${Math.round(props.route.totalDistanceKm)} km · ${Math.round(props.route.estimatedDurationMin)} min`
              : "Finding your route…"}
          </strong>
          <span>
            {props.route?.fallback
              ? "Approximate route · roads unavailable"
              : "Driving route"}
          </span>
        </div>
        <button
          className="edit-route"
          onClick={props.onEdit}
          aria-label={props.destination?.name ?? "Edit route"}
        >
          <Search size={18} />
        </button>
        <button onClick={props.onClear}>Clear Route ×</button>
      </div>
      <div className="buffer-toggle" role="group" aria-label="Corridor buffer">
        <span>Search along route</span>
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
    </>
  );
}
function ExpandedSearch({
  props,
  onCollapse,
}: {
  props: PlannerProps;
  onCollapse: () => void;
}): ReactElement {
  const inputs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    inputs.current
      ?.querySelector<HTMLInputElement>('[role="combobox"]')
      ?.focus();
  }, []);
  return (
    <div ref={inputs} className="expanded-search" onFocus={props.onExpand}>
      <PlannerInputs
        {...props}
        onDestination={(place): void => {
          props.onDestination(place);
          onCollapse();
        }}
      />
      <button className="current-location" onClick={props.onCurrent}>
        ◎ Current location
      </button>
    </div>
  );
}
export function RoutePlanner(props: PlannerProps): ReactElement {
  const { searchRequest, onSearchReady } = props;
  const [expanded, setExpanded] = useState(false);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!searchRequest) return;
    setExpanded(true);
    section.current
      ?.querySelector<HTMLInputElement>('[role="combobox"]')
      ?.focus();
    onSearchReady?.();
  }, [searchRequest, onSearchReady]);
  const expand = (): void => {
    setExpanded(true);
    props.onExpand?.();
  };
  return (
    <section ref={section} className="route-planner" aria-label="Route planner">
      {(!props.destination || expanded) && (
        <button
          className="search-pill"
          onClick={expanded ? (): void => setExpanded(false) : expand}
          aria-expanded={expanded}
        >
          <Search size={20} />
          <span>
            {props.destination
              ? props.destination.name
              : "Search a place or route"}
          </span>
          {expanded && <ChevronUp size={18} />}
        </button>
      )}
      {expanded && (
        <ExpandedSearch props={props} onCollapse={() => setExpanded(false)} />
      )}
      {props.destination && <RouteSummary {...props} onEdit={expand} />}
      <p className="range-context">
        {rangeContext(
          props.evModel,
          props.route?.totalDistanceKm,
          props.route?.fallback,
          props.accountPack,
          props.route?.estimatedDurationMin,
        )}
      </p>
    </section>
  );
}
export function RadarControls({
  radiusKm,
  area,
  onRadius,
  onBack,
}: {
  radiusKm: number;
  area: boolean;
  onRadius: (radius: number) => void;
  onBack: () => void;
}): ReactElement {
  return (
    <div className="radar-controls">
      {area ? (
        <button className="area-back" onClick={onBack}>
          Back to my location
        </button>
      ) : (
        <div className="radius-toggle" role="group" aria-label="Nearby radius">
          <span>Nearby</span>
          {[5, 10, 20].map((radius) => (
            <button
              key={radius}
              aria-pressed={radius === radiusKm}
              onClick={() => onRadius(radius)}
            >
              {radius} km
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
