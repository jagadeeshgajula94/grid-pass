import { useId, useState, type ReactElement, type KeyboardEvent } from "react";
import type { PlaceDto } from "../../domain/route";
import { usePlaceSearch } from "./use-place-search";
interface PlaceProps {
  label: string;
  value: string;
  onSelect: (place: PlaceDto) => void;
}
interface PlaceOptionsProps {
  id: string;
  label: string;
  places: PlaceDto[];
  loading: boolean;
  error: string;
  active: number;
  onSelect: (place: PlaceDto) => void;
}
function PlaceOptions({
  id,
  label,
  places,
  loading,
  error,
  active,
  onSelect,
}: PlaceOptionsProps): ReactElement {
  return (
    <div className="place-options glass">
      {loading && (
        <p role="status" className="planner-skeleton">
          Searching places…
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !places.length && (
        <p role="status">No places found. Try a nearby city.</p>
      )}
      <ul
        id={`${id}-places`}
        role="listbox"
        aria-label={`${label} suggestions`}
      >
        {places.map((place, index) => (
          <li
            key={place.id}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(place)}
          >
            {place.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
interface AutocompleteState {
  query: string | null;
  open: boolean;
  active: number;
  change: (value: string) => void;
  focus: () => void;
  dismiss: () => void;
  choose: (place: PlaceDto) => void;
  keyDown: (event: KeyboardEvent<HTMLInputElement>, places: PlaceDto[]) => void;
}
function navigatePlaces(
  event: KeyboardEvent<HTMLInputElement>,
  places: PlaceDto[],
  state: {
    active: number;
    open: boolean;
    dismiss: () => void;
    focus: () => void;
    choose: (place: PlaceDto) => void;
    setActive: (value: number) => void;
  },
): void {
  if (event.key === "Escape") {
    state.dismiss();
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    state.focus();
    state.setActive(
      Math.max(
        0,
        Math.min(
          places.length - 1,
          state.active + (event.key === "ArrowDown" ? 1 : -1),
        ),
      ),
    );
  }
  const place = places.at(state.active);
  if (event.key === "Enter" && state.active >= 0 && place && state.open) {
    event.preventDefault();
    state.choose(place);
  }
}
function useAutocomplete(onSelect: PlaceProps["onSelect"]): AutocompleteState {
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const dismiss = (): void => {
    setOpen(false);
    setQuery(null);
    setActive(-1);
  };
  const choose = (place: PlaceDto): void => {
    onSelect(place);
    dismiss();
  };
  const focus = (): void => setOpen(true);
  return {
    query,
    open,
    active,
    dismiss,
    choose,
    keyDown: (event, places): void =>
      navigatePlaces(event, places, {
        active,
        open,
        dismiss,
        focus,
        choose,
        setActive,
      }),
    focus,
    change: (value): void => {
      setQuery(value);
      setOpen(true);
      setActive(-1);
    },
  };
}
function PlaceInput({
  id,
  value,
  state,
  places,
  expanded,
}: {
  id: string;
  value: string;
  state: AutocompleteState;
  places: PlaceDto[];
  expanded: boolean;
}): ReactElement {
  return (
    <input
      id={id}
      role="combobox"
      autoComplete="off"
      maxLength={80}
      value={state.query ?? value}
      placeholder="Search a city or highway"
      aria-expanded={expanded}
      aria-controls={expanded ? `${id}-places` : undefined}
      aria-autocomplete="list"
      aria-activedescendant={
        expanded && state.active >= 0 && places.at(state.active)
          ? `${id}-${state.active}`
          : undefined
      }
      onFocus={state.focus}
      onChange={(event) => state.change(event.target.value)}
      onKeyDown={(event) => state.keyDown(event, places)}
    />
  );
}
export function PlaceAutocomplete({
  label,
  value,
  onSelect,
}: PlaceProps): ReactElement {
  const id = useId();
  const state = useAutocomplete(onSelect);
  const results = usePlaceSearch(
    state.query ?? "",
    state.open && state.query !== null,
  );
  const expanded =
    state.open && state.query !== null && state.query.trim().length >= 2;
  return (
    <div
      className="place-autocomplete"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) state.dismiss();
      }}
    >
      <label htmlFor={id}>{label}</label>
      <PlaceInput
        id={id}
        value={value}
        state={state}
        places={results.places}
        expanded={expanded}
      />
      {expanded && (
        <PlaceOptions
          {...results}
          id={id}
          label={label}
          active={state.active}
          onSelect={state.choose}
        />
      )}
    </div>
  );
}
