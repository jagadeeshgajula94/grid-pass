import { z } from "../lib/zod";
import { CONNECTORS, NETWORKS } from "../domain/station";

const numeric = (
  min: number,
  max: number,
): z.ZodPipe<z.ZodString, z.ZodCoercedNumber<string>> =>
  z.string().trim().min(1).pipe(z.coerce.number<string>().min(min).max(max));
export const nearbyQuerySchema = z.strictObject({
  lat: numeric(-90, 90),
  lng: numeric(-180, 180),
  radiusKm: numeric(1, 50).default(5),
  connector: z.enum(CONNECTORS).optional(),
  minKw: numeric(0, 400).optional(),
  network: z.enum(NETWORKS).optional(),
  availableOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
const text = z
  .string()
  .max(10000)
  .transform((value) =>
    Array.from(value)
      .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
      .join("")
      .trim()
      .slice(0, 200),
  );
const optionalText = text.nullish();
export const ocmPoiSchema = z.object({
  ID: z.number().int().nonnegative(),
  AddressInfo: z.object({
    Title: optionalText,
    AddressLine1: optionalText,
    Town: optionalText,
    Latitude: z.number().min(-90).max(90),
    Longitude: z.number().min(-180).max(180),
  }),
  OperatorInfo: z.object({ Title: optionalText }).nullish(),
  StatusType: z.object({ IsOperational: z.boolean().nullish() }).nullish(),
  Connections: z
    .array(
      z.object({
        ConnectionTypeID: z.number().int(),
        Quantity: z
          .number()
          .int()
          .min(1)
          .max(20)
          .nullish()
          .transform((value) => value ?? 1),
        PowerKW: z.number().min(0).max(400).nullish(),
        StatusType: z
          .object({ IsOperational: z.boolean().nullish() })
          .nullish(),
      }),
    )
    .max(100)
    .nullish(),
  DateLastStatusUpdate: z.iso.datetime({ offset: true }).nullish(),
});
export const ocmPayloadSchema = z.array(ocmPoiSchema).max(1000);
export type OcmPoi = z.infer<typeof ocmPoiSchema>;
