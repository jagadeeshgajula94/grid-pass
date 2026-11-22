import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../src/lib/env";

describe("startup environment", () => {
  it("treats a blank optional mock password as unset but rejects short values", () => {
    const input = { AUTH_SECRET: process.env.AUTH_SECRET };
    expect(
      validateEnvironment({ ...input, MOCK_USER_PASSWORD: "" })
        .MOCK_USER_PASSWORD,
    ).toBeUndefined();
    expect(() =>
      validateEnvironment({ ...input, MOCK_USER_PASSWORD: "short" }),
    ).toThrow("MOCK_USER_PASSWORD");
  });
  it("supplies defaults while requiring a signing secret", () => {
    expect(() => validateEnvironment({})).toThrow("AUTH_SECRET");
    expect(
      validateEnvironment({ AUTH_SECRET: process.env.AUTH_SECRET }),
    ).toEqual({
      AUTH_SECRET: process.env.AUTH_SECRET,
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      TRUST_PROXY_HEADERS: "false",
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
it.each([
  "file:///etc/passwd",
  "https://example.com/path",
  "https://user@example.com",
])("rejects a non-origin app URL %s", (url) => {
  expect(() =>
    validateEnvironment({
      AUTH_SECRET: process.env.AUTH_SECRET,
      NEXT_PUBLIC_APP_URL: url,
    }),
  ).toThrow("NEXT_PUBLIC_APP_URL");
});
it("validates explicit proxy-header trust", () => {
  const input = { AUTH_SECRET: process.env.AUTH_SECRET };
  expect(
    validateEnvironment({ ...input, TRUST_PROXY_HEADERS: "true" })
      .TRUST_PROXY_HEADERS,
  ).toBe("true");
  expect(() =>
    validateEnvironment({ ...input, TRUST_PROXY_HEADERS: "yes" }),
  ).toThrow("TRUST_PROXY_HEADERS");
});
