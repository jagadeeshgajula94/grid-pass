import { z } from "../lib/zod";
import { VARIANT_IDS } from "../domain/ev-catalogue";
export const packConfirmationSchema = z.strictObject({
  variantId: z.enum(VARIANT_IDS),
});
