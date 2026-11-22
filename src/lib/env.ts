import { z } from "./zod";

const environmentSchema = z.object({
  OPEN_CHARGE_MAP_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().min(1).max(512).optional(),
  ),
  AUTH_SECRET: z.string().min(32),
  MOCK_USER_PASSWORD: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(12).optional(),
  ),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  TRUST_PROXY_HEADERS: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_APP_URL: z
    .url({ protocol: /^https?$/ })
    .pipe(z.string().refine((value) => new URL(value).origin === value))
    .default("http://localhost:3000"),
});

export function validateEnvironment(
  input: Record<string, unknown>,
): z.infer<typeof environmentSchema> {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Invalid environment variables: ${fields.join(", ")}`);
  }
  return result.data;
}

export const env = validateEnvironment(process.env);
