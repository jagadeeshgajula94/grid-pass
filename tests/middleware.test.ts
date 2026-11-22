import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

const HEALTH_URL = "https://example.com/api/health";
const CSP_HEADER = "content-security-policy";

afterEach(() => vi.restoreAllMocks());

it("sets a fresh nonce and restrictive policy for each request", () => {
  const request = new NextRequest("https://example.com");
  const response = middleware(request);
  const policy = response.headers.get(CSP_HEADER);
  expect(policy).toContain("'nonce-");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("unsafe-inline");
  expect(policy).not.toContain("unsafe-eval");
  expect(
    response.headers.get("x-middleware-request-content-security-policy"),
  ).toBe(policy);
  expect(middleware(request).headers.get(CSP_HEADER)).not.toBe(policy);
});

it("allows API requests under the limit", () => {
  const request = new NextRequest(HEALTH_URL, {
    headers: { "x-forwarded-for": "192.0.2.1, 192.0.2.2" },
  });
  expect(middleware(request).status).toBe(200);
});

it("rejects excess API requests with Retry-After and CSP", async () => {
  const request = new NextRequest(HEALTH_URL, {
    headers: { "x-real-ip": "192.0.2.3" },
  });
  vi.spyOn(Date, "now").mockReturnValue(0);
  for (let count = 0; count < 60; count += 1) middleware(request);
  const response = middleware(request);
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(response.headers.get(CSP_HEADER)).toContain("'nonce-");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ error: "Too many requests" });
});

it("permits API requests again after the window resets", () => {
  const request = new NextRequest(HEALTH_URL, {
    headers: { "x-forwarded-for": "192.0.2.4" },
  });
  const clock = vi.spyOn(Date, "now").mockReturnValue(0);
  for (let count = 0; count < 60; count += 1) middleware(request);
  expect(middleware(request).status).toBe(429);
  clock.mockReturnValue(60_000);
  expect(middleware(request).status).toBe(200);
});

it("limits requests without client headers using a shared bucket", () => {
  const request = new NextRequest(HEALTH_URL);
  for (let count = 0; count < 60; count += 1) middleware(request);
  expect(middleware(request).status).toBe(429);
});
