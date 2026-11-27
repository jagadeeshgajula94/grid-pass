import { useId, useState, type ReactElement } from "react";
import { SELECTABLE_PACKS, type EvPack } from "../domain/ev-catalogue";
export function packLabel(pack: EvPack): string {
  const usable =
    pack.usableKwh === null ? "usable n/a" : `${pack.usableKwh} kWh usable`;
  return `${pack.nominalKwh} kWh · ${usable}`;
}
export interface VehicleChoice {
  model: string;
  variantId: string;
}

interface PickerProps extends VehicleChoice {
  onChange: (value: VehicleChoice) => void;
  locked?: boolean;
  onBlur?: () => void;
  invalid?: boolean;
  errorId?: string;
}
function ModelSelect({
  model,
  onChange,
  onBlur,
  invalid,
  errorId,
}: PickerProps): ReactElement {
  const models = [...new Set(SELECTABLE_PACKS.map((pack) => pack.model))];
  return (
    <label>
      Your EV model
      <select
        name="evModel"
        value={model}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        required
        onChange={(event) =>
          onChange({ model: event.target.value, variantId: "" })
        }
      >
        <option value="">Choose your EV</option>
        {models.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </label>
  );
}
function PackSelect({
  model,
  variantId,
  onChange,
  onBlur,
  invalid,
  errorId,
}: PickerProps): ReactElement {
  return (
    <label>
      Battery pack
      <select
        name="variantId"
        value={variantId}
        required
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => onChange({ model, variantId: event.target.value })}
      >
        <option value="">Choose your battery pack</option>
        {SELECTABLE_PACKS.filter((pack) => !model || pack.model === model).map(
          (pack) => (
            <option key={pack.id} value={pack.id}>
              {!model && `${pack.model} · `}
              {packLabel(pack)}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
export function VehiclePicker(props: PickerProps): ReactElement {
  return (
    <fieldset className="vehicle-picker">
      {props.locked ? (
        <p>
          {props.model}
          <small>From your account</small>
        </p>
      ) : (
        <ModelSelect {...props} />
      )}
      <PackSelect {...props} />
    </fieldset>
  );
}
export function RegistrationVehicle({
  onBlur,
  invalid,
}: {
  onBlur: () => void;
  invalid: boolean;
}): ReactElement {
  const errorId = useId();
  const [choice, setChoice] = useState<VehicleChoice>({
    model: "",
    variantId: "",
  });
  return (
    <>
      <VehiclePicker
        {...choice}
        onChange={setChoice}
        onBlur={onBlur}
        invalid={invalid}
        errorId={errorId}
      />
      {invalid && (
        <p className="field-error" role="alert" id={errorId}>
          Choose your EV model and battery pack
        </p>
      )}
    </>
  );
}
