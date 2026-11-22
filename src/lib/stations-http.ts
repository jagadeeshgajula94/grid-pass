import { NextResponse } from "next/server";
import { getCurrentUser } from "../services/auth.service";
import { findNearby } from "../services/station.service";
import { nearbyQuerySchema } from "../validation/stations.schema";
import { requestToken } from "./auth-http";
import { logEvent } from "./logger";

const PRIVATE_HEADERS = { "Cache-Control": "no-store" };
export async function handleNearby(request: Request): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const user = await getCurrentUser(requestToken(request));
    if (!user.ok)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    const params = new URL(request.url).searchParams;
    const parsed = nearbyQuerySchema.safeParse(Object.fromEntries(params));
    const duplicated =
      new Set(params.keys()).size !== [...params.keys()].length;
    if (!parsed.success || duplicated)
      return NextResponse.json(
        {
          error: "Invalid query",
          fields: parsed.success ? {} : parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    return NextResponse.json(await findNearby(parsed.data, requestId), {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch {
    logEvent("error", "stations.unexpected", requestId);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
