import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { safeNext } from "../src/lib/safe-next";
import { clientIp } from "../src/lib/client-ip";
import { hasTrustedOrigin } from "../src/lib/origin-check";
import { verifySessionToken } from "../src/services/session-token";
import { env } from "../src/lib/env";

vi.mock("jose/jwt/verify", () => ({ jwtVerify: vi.fn() }));
const BASE = "https://example.com";
const UNKNOWN = "unknown";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TRUST_PROXY_HEADERS", "true");
});
afterEach(() => vi.unstubAllEnvs());

it.each([
  "/" + "a".repeat(2048),
  "/path\u0000",
  "/path\u007f",
  "/\\evil.example",
  "//evil.example",
  "https://evil.example",
  ["/map"],
  null,
  "",
])("rejects unsafe or oversized next path %j", (value) => {
  expect(safeNext(value)).toBe("/map");
});
it("accepts a bounded relative return path", () => {
  expect(safeNext("/map?city=delhi#station")).toBe("/map?city=delhi#station");
});
it.each([
  "https://" + "a".repeat(2048),
  "https://user@example.com",
  "https://example.com/path",
  "null",
  "ftp://example.com",
])("rejects invalid Origin %s", (origin) => {
  expect(
    hasTrustedOrigin(new NextRequest(BASE, { headers: { origin } }), BASE),
  ).toBe(false);
});
it.each([
  "evil.example/path",
  "user@example.com",
  "host..example",
  "example.com:99999",
  "a".repeat(260),
  "[invalid]",
  "",
])("rejects invalid Host %s", (host) => {
  expect(
    hasTrustedOrigin(
      new NextRequest(BASE, { headers: { origin: BASE, host } }),
      BASE,
    ),
  ).toBe(false);
});
it.each(["other.example:3000", "[::1]:3000", "localhost"])(
  "accepts configured origins with valid Host %s",
  (host) => {
    const origin = `http://${host}`;
    expect(
      hasTrustedOrigin(
        new NextRequest(BASE, { headers: { host, origin } }),
        origin,
      ),
    ).toBe(true);
  },
);
it("validates expanded IPv6 Host addresses without trusting them as origins", () => {
  const origin = "https://[2001:db8::1]:3000";
  const host = "[2001:0db8:0000:0000:0000:0000:0000:0001]:3000";
  expect(
    hasTrustedOrigin(
      new NextRequest(BASE, { headers: { origin, host } }),
      origin,
    ),
  ).toBe(true);
  expect(
    hasTrustedOrigin(
      new NextRequest(BASE, {
        headers: { origin, host: host.replace(":3000", ":3001") },
      }),
      BASE,
    ),
  ).toBe(false);
});
it.each(["not-an-ip", "999.1.1.1", "192.168.1", "::gg", "x".repeat(2049)])(
  "rejects invalid forwarded IP %s",
  (value) => {
    expect(
      clientIp(
        new NextRequest(BASE, { headers: { "x-forwarded-for": value } }),
      ),
    ).toBe(UNKNOWN);
    expect(
      clientIp(new NextRequest(BASE, { headers: { "x-real-ip": value } })),
    ).toBe(UNKNOWN);
  },
);
it("accepts IPv6 and a valid first forwarded IPv4", () => {
  expect(
    clientIp(
      new NextRequest(BASE, { headers: { "x-real-ip": "2001:db8::1" } }),
    ),
  ).toBe("2001:db8::1");
  expect(
    clientIp(
      new NextRequest(BASE, {
        headers: { "x-forwarded-for": "192.0.2.1, 192.0.2.2" },
      }),
    ),
  ).toBe("192.0.2.1");
});
it.each(["", "a.b", "a.b.c.d", "a=.b.c", "a.b.c ", "a".repeat(4097) + ".b.c"])(
  "rejects malformed or oversized session cookie before jose %s",
  async (token) => {
    expect(await verifySessionToken(token, env.AUTH_SECRET)).toBeNull();
    expect(jwtVerify).not.toHaveBeenCalled();
  },
);
