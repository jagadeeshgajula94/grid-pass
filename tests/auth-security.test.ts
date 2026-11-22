import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { resetLimiters } from "../src/lib/middleware-security";
import { createSession } from "../src/services/session.service";
import { hasTrustedOrigin } from "../src/lib/origin-check";
import { clientIp } from "../src/lib/client-ip";

const BASE = "http://localhost:3000";
const LOGIN = "/api/auth/login";
function post(path = LOGIN, origin = BASE): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method: "POST",
    headers: { origin },
  });
}
beforeEach(resetLimiters);
afterEach(() => vi.unstubAllEnvs());
it.each(["", "gp_session=tampered"])(
  "redirects unauthenticated map requests (%s)",
  async (cookie) => {
    const response = await middleware(
      new NextRequest(`${BASE}/map`, { headers: { cookie } }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${BASE}/login?next=%2Fmap`);
    expect(response.headers.get("content-security-policy")).toContain("nonce-");
    expect(response.headers.get("cache-control")).toBe("no-store");
  },
);
it("allows JWT holders on map and delegates auth screens to server pages", async () => {
  const token = await createSession("owner-id");
  const headers = { cookie: `gp_session=${token}` };
  expect(
    (await middleware(new NextRequest(`${BASE}/map/stations`, { headers })))
      .status,
  ).toBe(200);
  expect(
    (await middleware(new NextRequest(`${BASE}/login`, { headers }))).status,
  ).toBe(200);
  expect((await middleware(new NextRequest(`${BASE}/register`))).status).toBe(
    200,
  );
});
it.each(["https://evil.example", "null", "", "not-url", `${BASE}/path`])(
  "rejects untrusted Origin %s",
  async (origin) => {
    const response = await middleware(post(LOGIN, origin));
    expect(response.status).toBe(403);
    expect(response.headers.get("content-security-policy")).toContain("nonce-");
  },
);
it("requires the configured origin even when a caller supplies matching Host", () => {
  const request = new NextRequest("https://other.example/api/auth/login", {
    headers: { host: "other.example", origin: "https://other.example" },
  });
  expect(hasTrustedOrigin(request, BASE)).toBe(false);
  expect(hasTrustedOrigin(post(), BASE)).toBe(true);
  expect(hasTrustedOrigin(post(), "invalid")).toBe(false);
  expect(
    hasTrustedOrigin(
      new NextRequest("https://example.com/api/auth/login", {
        headers: { host: "example.com", origin: "http://example.com" },
      }),
      "https://example.com",
    ),
  ).toBe(false);
});
it("limits the sixth login but keeps register in a separate bucket", async () => {
  for (let index = 0; index < 5; index++)
    expect((await middleware(post())).status).toBe(200);
  const response = await middleware(post());
  expect(response.status).toBe(429);
  expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await middleware(post("/api/auth/register"))).status).toBe(200);
});
it("extracts bounded client identity with ingress fallbacks", () => {
  vi.stubEnv("TRUST_PROXY_HEADERS", "true");
  const request = new NextRequest(BASE, {
    headers: { "x-forwarded-for": "192.0.2.1, 192.0.2.2" },
  });
  expect(clientIp(request)).toBe("192.0.2.1");
  expect(
    clientIp(new NextRequest(BASE, { headers: { "x-real-ip": "192.0.2.3" } })),
  ).toBe("192.0.2.3");
  expect(clientIp(new NextRequest(BASE))).toBe("unknown");
});
it("ignores caller-controlled IP headers unless a trusted proxy is configured", async () => {
  vi.stubEnv("TRUST_PROXY_HEADERS", "false");
  for (let index = 0; index < 61; index++) {
    const request = new NextRequest(`${BASE}/api/health`, {
      headers: {
        "x-forwarded-for": `192.0.2.${index}`,
        "x-real-ip": "192.0.2.200",
      },
    });
    expect(clientIp(request)).toBe("unknown");
    expect((await middleware(request)).status).toBe(index < 60 ? 200 : 429);
  }
});
