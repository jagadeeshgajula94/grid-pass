import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

it("sets a fresh nonce and restrictive policy for each request", () => {
  const request = new NextRequest("https://example.com");
  const response = middleware(request);
  const policy = response.headers.get("content-security-policy");
  expect(policy).toContain("'nonce-");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("unsafe-inline");
  expect(policy).not.toContain("unsafe-eval");
  expect(
    response.headers.get("x-middleware-request-content-security-policy"),
  ).toBe(policy);
  expect(middleware(request).headers.get("content-security-policy")).not.toBe(
    policy,
  );
});
