import type { ReactElement } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "../../services/auth.service";
import { SESSION_COOKIE } from "../../services/session-token";
import { MapWorkspace } from "../../components/map/MapWorkspace";

export default async function MapPage(): Promise<ReactElement> {
  const jar = await cookies();
  const result = await getCurrentUser(jar.get(SESSION_COOKIE)?.value ?? "");
  if (!result.ok) return <MapWorkspace />;
  return (
    <MapWorkspace
      firstName={result.value.fullName.split(" ")[0] ?? "Driver"}
      evModel={result.value.evModel}
    />
  );
}
