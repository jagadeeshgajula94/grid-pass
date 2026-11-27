import { z } from "../../lib/zod";
import { AppError } from "../../lib/errors";
import type { Result } from "../../lib/result";
import { EV_MODELS, VARIANT_IDS } from "../../domain/ev-catalogue";
import type {
  RecommendationDto,
  RecommendationRequest,
} from "../../domain/recommendation";
import { stationSchema } from "./stations-client";
const responseSchema = z.object({
  evModel: z.enum(EV_MODELS),
  batteryPercent: z.number().min(1).max(100),
  contextMode: z.enum(["nearby", "area", "route"]),
  usableRangeKm: z.number().nonnegative(),
  reachableRangeKm: z.number().nonnegative(),
  approximateRoadDistances: z.boolean(),
  variantId: z.enum(VARIANT_IDS),
  packConfirmed: z.boolean(),
  packMessage: z.string().max(160).optional(),
  carPosition: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  positionSource: z.enum(["gps", "route", "assumed"]),
  consumptionWhPerKm: z.number().positive(),
  comfortableRangeKm: z.number().nonnegative(),
  tier: z.enum(["A", "B"]).nullable(),
  message: z.string().max(500),
  routeMessage: z.string().max(500).optional(),
  recommendations: z
    .array(
      z.object({
        station: stationSchema,
        availableConnectors: z.number().int().nonnegative(),
        effectivePowerKw: z.number().positive().max(400),
        arrivalPercent: z.number().min(0).max(100),
        tier: z.enum(["A", "B"]),
        wait: z.object({
          minutes: z.number().nonnegative(),
          estimated: z.literal(true),
          unverified: z.literal(true),
          availability: z.enum(["free", "busy", "unknown"]),
        }),
        chargeMinutes: z.number().nonnegative(),
        roadDistanceKm: z.number().nonnegative(),
        reason: z.string().max(500),
      }),
    )
    .max(3),
});
export async function fetchRecommendations(
  query: RecommendationRequest,
  signal: AbortSignal,
): Promise<Result<RecommendationDto | null, AppError>> {
  try {
    const response = await fetch("/api/recommendations/charging", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    if (!response.ok)
      return {
        ok: false,
        error: new AppError(
          "UPSTREAM_UNAVAILABLE",
          response.status === 429
            ? "Too many searches. Please wait a minute and retry."
            : "Unable to find charging options. Check your EV model and retry.",
        ),
      };
    const payload: unknown = await response.json();
    const parsed = responseSchema.safeParse(payload);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : {
          ok: false,
          error: new AppError(
            "VALIDATION",
            "Charging data unavailable. Please retry.",
          ),
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
