import type { NextRequest } from "next/server";
export function hasTrustedOrigin(
  request: NextRequest,
  appUrl: string,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    if (
      parsed.origin !== origin ||
      !["http:", "https:"].includes(parsed.protocol)
    )
      return false;
    return (
      parsed.origin === new URL(appUrl).origin ||
      parsed.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
