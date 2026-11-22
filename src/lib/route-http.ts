import { NextResponse } from "next/server";
import { findCorridor } from "../services/route.service";
import { routeQuerySchema } from "../validation/route.schema";
import { publicApi, invalidRequest, readApiBody } from "./api-http";
export function handleCorridor(request: Request): Promise<NextResponse> {
  return publicApi("route.corridor", async (requestId) => {
    const parsed = routeQuerySchema.safeParse(await readApiBody(request));
    if (!parsed.success) return invalidRequest(parsed.error);
    return NextResponse.json(await findCorridor(parsed.data, requestId), {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  });
}
