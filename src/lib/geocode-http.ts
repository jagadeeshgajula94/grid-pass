import { NextResponse } from "next/server";
import { searchPlaces } from "../services/geocode.service";
import { geocodeQuerySchema } from "../validation/geocode.schema";
import { authenticatedApi, invalidRequest } from "./api-http";
export function handleGeocode(request: Request): Promise<NextResponse> {
  return authenticatedApi(request, "geocode.search", async (requestId) => {
    const params = new URL(request.url).searchParams;
    const parsed = geocodeQuerySchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return invalidRequest(parsed.error);
    if (new Set(params.keys()).size !== [...params.keys()].length)
      return invalidRequest();
    return NextResponse.json(
      { places: await searchPlaces(parsed.data.q, requestId) },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  });
}
