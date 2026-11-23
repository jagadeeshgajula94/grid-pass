import { z } from "../lib/zod";
import { EV_MODELS } from "../domain/ev-models";
export { EV_MODELS } from "../domain/ev-models";
export const PASSWORD_RULES = [
  {
    label: "12–128 characters",
    test: (value: string): boolean => value.length >= 12 && value.length <= 128,
  },
  {
    label: "Uppercase letter",
    test: (value: string): boolean => /[A-Z]/.test(value),
  },
  {
    label: "Lowercase letter",
    test: (value: string): boolean => /[a-z]/.test(value),
  },
  { label: "Number", test: (value: string): boolean => /\d/.test(value) },
  {
    label: "Symbol",
    test: (value: string): boolean => /[^A-Za-z0-9\s]/.test(value),
  },
] as const;
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const password = z
  .string()
  .min(12)
  .max(128)
  .superRefine((value, context) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(value))
        context.addIssue({ code: "custom", message: rule.label });
    }
  });
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(
        /^[\p{L}\p{M} .'-]+$/u,
        "Use letters, spaces, periods, apostrophes or hyphens",
      ),
    email,
    phone: z
      .string()
      .max(30)
      .transform((value) => value.replaceAll(" ", ""))
      .pipe(
        z
          .string()
          .regex(
            /^\+91[6-9]\d{9}$/,
            "Use +91 followed by a 10-digit Indian mobile number",
          ),
      ),
    evModel: z.enum(EV_MODELS),
    password,
  })
  .strict();
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
