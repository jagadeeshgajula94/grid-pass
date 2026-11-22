import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser } from "../services/auth.service";
import { requestToken } from "./auth-http";
import { logEvent } from "./logger";
import { readLimited } from "./upstream-fetch";
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
export async function authenticatedApi(
  request: Request,
  event: string,
  handle: (requestId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const user = await getCurrentUser(requestToken(request));
    if (!user.ok)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: PRIVATE_HEADERS },
      );
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
export async function readApiBody(
  request: Request,
  maxBytes = 4096,
): Promise<unknown> {
  try {
    return await readLimited(
      new Response(request.body, { headers: request.headers }),
      maxBytes,
    );
  } catch {
    return undefined;
  }
}
