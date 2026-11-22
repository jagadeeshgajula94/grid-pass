import type { ReactElement } from "react";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthForm } from "../../components/auth/AuthForm";
import { redirectAuthenticatedUser } from "../../lib/auth-page";

export default async function RegisterPage(): Promise<ReactElement> {
  await redirectAuthenticatedUser();
  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
