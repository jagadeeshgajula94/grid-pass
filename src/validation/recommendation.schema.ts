import { z } from "../lib/zod";
import { EV_MODELS } from "../domain/ev-models";
import { pointSchema } from "./route.schema";
const radiusKm = z.number().min(1).max(50);
export const recommendationSchema = z.strictObject({
  batteryPercent: z.number().min(1).max(100),
  evModel: z.enum(EV_MODELS).optional(),
  context: z.discriminatedUnion("mode", [
    z.strictObject({
      mode: z.literal("route"),
      origin: pointSchema,
      destination: pointSchema,
      destinationName: z.string().trim().min(1).max(160).optional(),
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
