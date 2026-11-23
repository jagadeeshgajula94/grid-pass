import { z } from "../../lib/zod";
import { AppError } from "../../lib/errors";
import type { Result } from "../../lib/result";
import { EV_MODELS } from "../../domain/ev-models";
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
  message: z.string().max(500),
  recommendations: z
    .array(
      z.object({
        station: stationSchema,
        availableConnectors: z.number().int().positive(),
        effectivePowerKw: z.number().positive().max(400),
        arrivalPercent: z.number().min(10).max(100),
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
