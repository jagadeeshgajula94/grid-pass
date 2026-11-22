import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../src/lib/env";

describe("startup environment", () => {
  it("supplies non-secret defaults for an empty environment", () => {
    expect(validateEnvironment({})).toEqual({
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });
  it("accepts a configured production origin", () => {
    expect(
      validateEnvironment({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://example.com",
      }).NODE_ENV,
    ).toBe("production");
  });
  it("rejects invalid values without revealing them", () => {
    expect(() =>
      validateEnvironment({ NEXT_PUBLIC_APP_URL: "sensitive-invalid-value" }),
    ).toThrow("Invalid environment variables: NEXT_PUBLIC_APP_URL");
    expect(() => validateEnvironment({ NODE_ENV: "invalid" })).toThrow(
      "Invalid environment variables: NODE_ENV",
    );
  });
});
