import type { ReactElement } from "react";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthForm } from "../../components/auth/AuthForm";
import { safeNext } from "../../lib/safe-next";
import { redirectAuthenticatedUser } from "../../lib/auth-page";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactElement> {
  await redirectAuthenticatedUser();
  const parameters = await searchParams;
  return (
    <AuthShell>
      <AuthForm mode="login" next={safeNext(parameters.next)} />
    </AuthShell>
  );
}
