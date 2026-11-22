import type { ReactElement } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../services/auth.service";
import { SESSION_COOKIE } from "../../services/session-token";
import { MapWorkspace } from "../../components/map/MapWorkspace";

export default async function MapPage(): Promise<ReactElement> {
  const jar = await cookies();
  const result = await getCurrentUser(jar.get(SESSION_COOKIE)?.value ?? "");
  if (!result.ok) redirect("/login");
  return (
    <MapWorkspace
      firstName={result.value.fullName.split(" ")[0] ?? "Driver"}
      evModel={result.value.evModel}
    />
  );
}
