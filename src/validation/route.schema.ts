import { z } from "../lib/zod";
import { CONNECTORS, NETWORKS } from "../domain/station";
export const pointSchema = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export const routeQuerySchema = z.strictObject({
  origin: pointSchema,
  destination: pointSchema,
  bufferKm: z.number().min(1).max(15).default(5),
  connector: z.enum(CONNECTORS).optional(),
  minKw: z.number().min(0).max(400).optional(),
  network: z.enum(NETWORKS).optional(),
  availableOnly: z.boolean().optional(),
});
export type RouteQuery = z.infer<typeof routeQuerySchema>;
export const osrmPayloadSchema = z.object({
  code: z.literal("Ok"),
  routes: z
    .array(
      z.object({
        distance: z.number().nonnegative().max(100_000_000),
        duration: z.number().nonnegative().max(100_000_000),
        geometry: z.object({
          type: z.literal("LineString"),
          coordinates: z
            .array(
              z.tuple([
                z.number().min(-180).max(180),
                z.number().min(-90).max(90),
              ]),
            )
            .min(2)
            .max(10000),
        }),
      }),
    )
    .min(1)
    .max(3),
});
