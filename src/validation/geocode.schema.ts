import { z } from "../lib/zod";
const clean = (value: string): string =>
  Array.from(value)
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    .join("")
    .trim();
export const geocodeQuerySchema = z.strictObject({
  q: z
    .string()
    .max(160)
    .transform(clean)
    .pipe(
      z
        .string()
        .min(2)
        .max(80)
        .regex(/^[\p{L}\p{N} ,.'()/\-]+$/u),
    ),
});
export const nominatimPayloadSchema = z
  .array(
    z.object({
      place_id: z.number().int().nonnegative(),
      display_name: z.string().max(1000).transform(clean),
      lat: z.string().max(30).pipe(z.coerce.number<string>().min(-90).max(90)),
      lon: z
        .string()
        .max(30)
        .pipe(z.coerce.number<string>().min(-180).max(180)),
    }),
  )
  .max(10);
