import type { ReactElement } from "react";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthForm } from "../../components/auth/AuthForm";

export default function RegisterPage(): ReactElement {
  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
