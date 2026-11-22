import { z } from "../../lib/zod";
import type { Result } from "../../lib/result";
import { AppError } from "../../lib/errors";

const responseSchema = z.object({ error: z.string().optional() });
export async function submitAuth(
  mode: "login" | "register",
  data: unknown,
): Promise<Result<null, AppError>> {
  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) return { ok: true, value: null };
    const parsed = responseSchema.safeParse((await response.json()) as unknown);
    const message = parsed.success ? parsed.data.error : undefined;
    return {
      ok: false,
      error: new AppError(
        "VALIDATION",
        message ?? "Unable to sign in. Please try again.",
      ),
    };
  } catch {
    return {
      ok: false,
      error: new AppError(
        "VALIDATION",
        "Connection unavailable. Please try again.",
      ),
    };
  }
}
