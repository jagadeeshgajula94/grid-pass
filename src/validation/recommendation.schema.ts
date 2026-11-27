import { z } from "../lib/zod";
import { EV_MODELS, VARIANT_IDS } from "../domain/ev-catalogue";
import { pointSchema } from "./route.schema";
const radiusKm = z.number().min(1).max(50);
export const recommendationSchema = z.strictObject({
  batteryPercent: z.number().min(1).max(100),
  evModel: z.enum(EV_MODELS).optional(),
  variantId: z.enum(VARIANT_IDS).optional(),
  carPosition: pointSchema,
  positionSource: z.enum(["gps", "route", "assumed"]),
  context: z.discriminatedUnion("mode", [
    z.strictObject({
      mode: z.literal("route"),
      origin: pointSchema,
      destination: pointSchema,
      destinationName: z
        .string()
        .trim()
        .min(1)
        .transform((name) => name.slice(0, 160))
        .optional(),
      bufferKm: z.number().min(1).max(15).default(5),
    }),
    z.strictObject({ mode: z.literal("area"), center: pointSchema, radiusKm }),
    z.strictObject({
      mode: z.literal("nearby"),
      center: pointSchema,
      radiusKm: radiusKm.default(5),
    }),
  ]),
});
