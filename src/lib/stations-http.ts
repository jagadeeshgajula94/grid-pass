import { NextResponse } from "next/server";
import { findNearby } from "../services/station.service";
import { nearbyQuerySchema } from "../validation/stations.schema";
import { publicApi, invalidRequest } from "./api-http";
export function handleNearby(request: Request): Promise<NextResponse> {
  return publicApi("stations.nearby", async (requestId) => {
    const params = new URL(request.url).searchParams;
    const parsed = nearbyQuerySchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return invalidRequest(parsed.error);
    if (new Set(params.keys()).size !== [...params.keys()].length)
      return invalidRequest();
    return NextResponse.json(await findNearby(parsed.data, requestId), {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  });
}
