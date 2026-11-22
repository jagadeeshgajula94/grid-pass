import { z } from "./zod";

const returnPathSchema = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^\/(?!\/)[^\s\\]*$/)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));

export function safeNext(value: unknown): string {
  const result = returnPathSchema.safeParse(value);
  if (!result.success) return "/map";
  try {
    const parsed = new URL(result.data, "https://gridpass.invalid");
    return parsed.origin === "https://gridpass.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/map";
  } catch {
    return "/map";
  }
}
