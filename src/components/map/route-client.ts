import { z } from "../../lib/zod";
import { AppError } from "../../lib/errors";
import type { Result } from "../../lib/result";
import type { CorridorDto, PlaceDto } from "../../domain/route";
import type { RouteQuery } from "../../validation/route.schema";
import { pointSchema } from "../../validation/route.schema";
import { stationSchema } from "./stations-client";
const placesSchema = z.object({
  places: z
    .array(
      pointSchema.extend({
        id: z.string().max(100),
        name: z.string().max(1000),
      }),
    )
    .max(10),
});
const corridorSchema = z.object({
  route: z.object({
    coordinates: z.array(pointSchema).min(2).max(10000),
    totalDistanceKm: z.number().nonnegative(),
    estimatedDurationMin: z.number().nonnegative(),
    fallback: z.boolean(),
  }),
  stations: z
    .array(
      stationSchema.extend({
        distanceKm: z.number().min(0).max(15),
        kmAlongRoute: z.number().nonnegative(),
        detourKm: z.number().min(0).max(30),
      }),
    )
    .max(300),
  bufferKm: z.number().min(1).max(15),
  sources: z.array(z.string().max(100)).max(5),
});
async function plannerRequest<T>(
  url: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  body?: RouteQuery,
): Promise<Result<T | null, AppError>> {
  try {
    const response = await fetch(url, {
      signal,
      ...(body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    if (!response.ok)
      return {
        ok: false,
        error: new AppError(
          response.status === 401 ? "UNAUTHENTICATED" : "UPSTREAM_UNAVAILABLE",
          response.status === 401
            ? "Session expired. Please sign in again."
            : "Unable to load trip data. Please retry.",
        ),
      };
    const payload: unknown = await response.json();
    const parsed = schema.safeParse(payload);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : {
          ok: false,
          error: new AppError("VALIDATION", "Trip data unavailable."),
        };
  } catch {
    return signal.aborted
      ? { ok: true, value: null }
      : {
          ok: false,
          error: new AppError(
            "UPSTREAM_UNAVAILABLE",
            "Connection unavailable. Please retry.",
          ),
        };
  }
}
export async function fetchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<Result<PlaceDto[] | null, AppError>> {
  const result = await plannerRequest(
    `/api/geocode/search?${new URLSearchParams({ q: query })}`,
    placesSchema,
    signal,
  );
  return result.ok ? { ok: true, value: result.value?.places ?? null } : result;
}
export function fetchCorridor(
  query: RouteQuery,
  signal: AbortSignal,
): Promise<Result<CorridorDto | null, AppError>> {
  return plannerRequest("/api/routes/corridor", corridorSchema, signal, query);
}
