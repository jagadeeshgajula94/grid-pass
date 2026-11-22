import { z } from "./zod";

const environmentSchema = z.object({
  AUTH_SECRET: z.string().min(32),
  MOCK_USER_PASSWORD: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(12).optional(),
  ),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
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
