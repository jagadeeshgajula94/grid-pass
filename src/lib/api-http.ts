import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser } from "../services/auth.service";
import { requestToken } from "./auth-http";
import { logEvent } from "./logger";
export { readApiBody } from "./request-body";
const PRIVATE_HEADERS = { "Cache-Control": "no-store" };
export function invalidRequest(error?: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid request",
      fields: error ? error.flatten().fieldErrors : {},
    },
    { status: 400, headers: PRIVATE_HEADERS },
  );
}
export async function publicApi(
  event: string,
  handle: (requestId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const response = await handle(requestId);
    logEvent("info", event, requestId, { status: response.status });
    return response;
  } catch {
    logEvent("error", `${event}.unexpected`, requestId);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
export function authenticatedApi(
  request: Request,
  event: string,
  handle: (requestId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  return publicApi(event, async (requestId) => {
    const user = await getCurrentUser(requestToken(request));
    if (!user.ok)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    return handle(requestId);
  });
}
