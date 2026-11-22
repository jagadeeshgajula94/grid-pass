import { NextResponse } from "next/server";
import { searchPlaces } from "../services/geocode.service";
import { geocodeQuerySchema } from "../validation/geocode.schema";
import { publicApi, invalidRequest } from "./api-http";
export function handleGeocode(request: Request): Promise<NextResponse> {
  return publicApi("geocode.search", async (requestId) => {
    const params = new URL(request.url).searchParams;
    const parsed = geocodeQuerySchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return invalidRequest(parsed.error);
    if (new Set(params.keys()).size !== [...params.keys()].length)
      return invalidRequest();
    const result = await searchPlaces(
      parsed.data.q,
      requestId,
      parsed.data.mode,
    );
    if (!result.ok)
      return NextResponse.json(
        { error: result.error.message },
        {
          status: 503,
          headers: { "Cache-Control": "no-store", "Retry-After": "1" },
        },
      );
    return NextResponse.json(
      { places: result.value },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  });
}
