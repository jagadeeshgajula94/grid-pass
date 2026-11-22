import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../src/lib/env";

describe("startup environment", () => {
  it("supplies defaults while requiring a signing secret", () => {
    expect(() => validateEnvironment({})).toThrow("AUTH_SECRET");
    expect(
      validateEnvironment({ AUTH_SECRET: process.env.AUTH_SECRET }),
    ).toEqual({
      AUTH_SECRET: process.env.AUTH_SECRET,
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });
  it("accepts a configured production origin", () => {
    expect(
      validateEnvironment({
        AUTH_SECRET: process.env.AUTH_SECRET,
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://example.com",
      }).NODE_ENV,
    ).toBe("production");
  });
  it("rejects invalid values without revealing them", () => {
    expect(() =>
      validateEnvironment({
        AUTH_SECRET: process.env.AUTH_SECRET,
        NEXT_PUBLIC_APP_URL: "sensitive-invalid-value",
      }),
    ).toThrow("Invalid environment variables: NEXT_PUBLIC_APP_URL");
    expect(() =>
      validateEnvironment({
        AUTH_SECRET: process.env.AUTH_SECRET,
        NODE_ENV: "invalid",
      }),
    ).toThrow("Invalid environment variables: NODE_ENV");
  });
});
