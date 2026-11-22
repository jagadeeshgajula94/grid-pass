import type { ReactElement } from "react";
import { PASSWORD_RULES } from "../../validation/auth.schema";

export function PasswordStrength({
  password,
}: {
  password: string;
}): ReactElement {
  const score = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  return (
    <div className="password-strength" id="password-rules">
      <meter
        min={0}
        max={PASSWORD_RULES.length}
        value={score}
        aria-label="Password strength"
      />
      <ul>
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.label} data-met={rule.test(password)}>
            {rule.test(password) ? "✓" : "○"} {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
