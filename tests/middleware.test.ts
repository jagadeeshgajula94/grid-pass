import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { resetLimiters } from "../src/lib/middleware-security";

const HEALTH_URL = "https://example.com/api/health";
const CSP_HEADER = "content-security-policy";
const UNSAFE_INLINE = "unsafe-inline";
beforeEach(resetLimiters);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("sets fresh nonce CSP on responses and forwarded requests", async () => {
  const request = new NextRequest("https://example.com");
  const response = await middleware(request);
  const policy = response.headers.get(CSP_HEADER);
  expect(policy).toContain("'nonce-");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain(UNSAFE_INLINE);
  expect(policy).not.toContain("unsafe-eval");
  expect(
    response.headers.get("x-middleware-request-content-security-policy"),
  ).toBe(policy);
  expect((await middleware(request)).headers.get(CSP_HEADER)).not.toBe(policy);
});
it.each(["test", "production"])(
  "keeps %s script policy strict",
  async (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    const response = await middleware(new NextRequest(HEALTH_URL));
    expect(response.headers.get(CSP_HEADER)).not.toContain("unsafe-eval");
    expect(response.headers.get(CSP_HEADER)).not.toContain(UNSAFE_INLINE);
    expect(response.headers.get(CSP_HEADER)).toMatch(
      /style-src 'self' 'nonce-[^']+'/,
    );
  },
);
it("permits React Refresh eval only in development", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const response = await middleware(new NextRequest(HEALTH_URL));
  expect(response.headers.get(CSP_HEADER)).toContain("'unsafe-eval'");
  expect(response.headers.get(CSP_HEADER)).toContain("'nonce-");
  expect(response.headers.get(CSP_HEADER)).toContain(
    "style-src 'self' 'unsafe-inline'",
  );
  expect(response.headers.get(CSP_HEADER)).not.toMatch(/style-src[^;]*nonce-/);
  expect(response.headers.get(CSP_HEADER)).toMatch(/script-src[^;]*nonce-/);
});
it("limits all APIs and expires windows, including unknown clients", async () => {
  const request = new NextRequest(HEALTH_URL);
  const clock = vi.spyOn(Date, "now").mockReturnValue(0);
  for (let count = 0; count < 60; count += 1)
    expect((await middleware(request)).status).toBe(200);
  const response = await middleware(request);
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(response.headers.get(CSP_HEADER)).toContain("'nonce-");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ error: "Too many requests" });
  clock.mockReturnValue(60_000);
  expect((await middleware(request)).status).toBe(200);
});
