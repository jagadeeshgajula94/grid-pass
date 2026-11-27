import { z } from "../../lib/zod";
import { CONNECTORS, NETWORKS, type StationDto } from "../../domain/station";
import type { Point } from "../../lib/geo";
import type { Result } from "../../lib/result";
import { AppError, type ErrorCode } from "../../lib/errors";

export const stationSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  network: z.enum(NETWORKS),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  distanceKm: z.number().min(0).max(50),
  address: z.string().max(300),
  lastUpdated: z.iso.datetime({ offset: true }),
  statusSource: z.enum(["demo", "unknown occupancy"]).optional(),
  amenities: z.array(z.enum(["restroom", "cafe", "dining", "wifi"])),
  connectors: z.array(
    z.object({
      type: z.enum(CONNECTORS),
      powerKw: z.number().min(0).max(400),
      tariffInrPerKwh: z.number().nonnegative().nullable(),
      status: z.enum(["available", "busy", "unknown", "offline"]),
    }),
  ),
});
const responseSchema = z.object({
  stations: z.array(stationSchema).max(300),
  center: z.object({ lat: z.number(), lng: z.number() }),
  radiusKm: z.number(),
  sources: z.array(z.string()),
});
function failure(code: ErrorCode, message: string): Result<never, AppError> {
  return { ok: false, error: new AppError(code, message) };
}
export async function fetchStations(
  center: Point,
  signal: AbortSignal,
  radiusKm = 5,
): Promise<Result<StationDto[] | null, AppError>> {
  try {
    const query = new URLSearchParams({
      lat: String(center.lat),
      lng: String(center.lng),
      radiusKm: String(radiusKm),
    });
    const response = await fetch(`/api/stations/nearby?${query}`, { signal });
    if (response.status === 401)
      return failure(
        "UNAUTHENTICATED",
        "Session expired. Please sign in again.",
      );
    if (!response.ok)
      return failure(
        "UPSTREAM_UNAVAILABLE",
        "Unable to load stations. Try another location.",
      );
    const payload: unknown = await response.json();
    const parsed = responseSchema.safeParse(payload);
    return parsed.success
      ? { ok: true, value: parsed.data.stations }
      : failure("VALIDATION", "Station data unavailable.");
  } catch (error: unknown) {
    if (
      signal.aborted ||
      ((error instanceof Error || error instanceof DOMException) &&
        error.name === "AbortError")
    )
      return { ok: true, value: null };
    return error instanceof SyntaxError
      ? failure("VALIDATION", "Station data unavailable.")
      : failure(
          "UPSTREAM_UNAVAILABLE",
          "Connection unavailable. Please retry.",
        );
  }
}
