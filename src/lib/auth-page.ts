import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../services/auth.service";
import { SESSION_COOKIE } from "../services/session-token";

export async function redirectAuthenticatedUser(): Promise<void> {
  const jar = await cookies();
  const result = await getCurrentUser(jar.get(SESSION_COOKIE)?.value ?? "");
  if (result.ok) redirect("/map");
}
