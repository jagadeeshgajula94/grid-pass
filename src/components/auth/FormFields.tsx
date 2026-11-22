import type { ReactElement } from "react";
import { EV_MODELS } from "../../validation/auth.schema";
import { PasswordStrength } from "./PasswordStrength";

export type FieldErrors = Record<string, string[] | undefined>;
interface FieldsProps {
  isRegister: boolean;
  errors: FieldErrors;
  password: string;
  onPassword: (value: string) => void;
  onBlur: () => void;
}
interface FieldProps {
  name: string;
  label: string;
  type?: string;
  autoComplete: string;
  error?: string[];
  onBlur: () => void;
  onChange?: (value: string) => void;
  descriptionId?: string;
}
function Field({
  name,
  label,
  type = "text",
  autoComplete,
  error,
  onBlur,
  onChange,
  descriptionId,
}: FieldProps): ReactElement {
  const description = [error ? `${name}-error` : "", descriptionId]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        onBlur={onBlur}
        onChange={(event) => onChange?.(event.target.value)}
        aria-invalid={!!error}
        aria-describedby={description || undefined}
      />
      {error && (
        <span className="field-error" id={`${name}-error`}>
          {error[0]}
        </span>
      )}
    </div>
  );
}
function RegisterFields({
  errors,
  onBlur,
}: Pick<FieldsProps, "errors" | "onBlur">): ReactElement {
  return (
    <>
      <Field
        name="fullName"
        label="Full name"
        autoComplete="name"
        error={errors.fullName}
        onBlur={onBlur}
      />
      <Field
        name="phone"
        label="Mobile number (+91)"
        type="tel"
        autoComplete="tel"
        error={errors.phone}
        onBlur={onBlur}
      />
      <VehicleField error={errors.evModel} onBlur={onBlur} />
    </>
  );
}
function VehicleField({
  error,
  onBlur,
}: {
  error?: string[];
  onBlur: () => void;
}): ReactElement {
  return (
    <div className="field">
      <label htmlFor="evModel">Your electric vehicle</label>
      <select
        id="evModel"
        name="evModel"
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? "evModel-error" : undefined}
      >
        <option value="">Select your EV</option>
        {EV_MODELS.map((model) => (
          <option key={model}>{model}</option>
        ))}
      </select>
      {error && (
        <span className="field-error" id="evModel-error">
          Choose your EV model
        </span>
      )}
    </div>
  );
}
export function FormFields({
  isRegister,
  errors,
  password,
  onPassword,
  onBlur,
}: FieldsProps): ReactElement {
  return (
    <>
      {isRegister && <RegisterFields errors={errors} onBlur={onBlur} />}
      <Field
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email}
        onBlur={onBlur}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        descriptionId={isRegister ? "password-rules" : undefined}
        error={errors.password}
        onBlur={onBlur}
        onChange={onPassword}
      />
      {isRegister && <PasswordStrength password={password} />}
    </>
  );
}
