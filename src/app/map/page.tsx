import type { ReactElement } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../services/auth.service";
import { SESSION_COOKIE } from "../../services/session-token";
import { SignOutButton } from "../../components/auth/SignOutButton";
import { AuthShell } from "../../components/auth/AuthShell";

export default async function MapPage(): Promise<ReactElement> {
  const jar = await cookies();
  const result = await getCurrentUser(jar.get(SESSION_COOKIE)?.value ?? "");
  if (!result.ok) redirect("/login");
  return (
    <AuthShell>
      <div className="form-content">
        <div className="eyebrow">CONNECTED TO GRIDPASS</div>
        <h1>Hello, {result.value.fullName}.</h1>
        <p className="muted">{result.value.evModel}</p>
        <p>Your charging map is coming next. Your account is ready.</p>
        <SignOutButton />
      </div>
    </AuthShell>
  );
}
