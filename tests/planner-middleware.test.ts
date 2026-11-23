import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkApi, resetLimiters } from "../src/lib/middleware-security";
const CORRIDOR_PATH = "/api/routes/corridor";
const RECOMMENDATION_PATH = "/api/recommendations/charging";
beforeEach(() => {
  resetLimiters();
  vi.stubEnv("TRUST_PROXY_HEADERS", "true");
});
afterEach(() => vi.unstubAllEnvs());
it.each([
  ["/api/geocode/search", 30],
  [CORRIDOR_PATH, 10],
  [RECOMMENDATION_PATH, 10],
] as const)("limits %s separately per IP", (path, limit) => {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: { "x-forwarded-for": "192.0.2.1" },
  });
  for (let i = 0; i < limit; i++) expect(checkApi(request)).toBeUndefined();
  expect(checkApi(request)?.status).toBe(429);
  expect(
    checkApi(
      new NextRequest(`http://localhost:3000${path}`, {
        headers: { "x-forwarded-for": "192.0.2.2" },
      }),
    ),
  ).toBeUndefined();
});
it.each([CORRIDOR_PATH, RECOMMENDATION_PATH])(
  "requires the trusted Origin for %s POST",
  (path) => {
    expect(
      checkApi(
        new NextRequest(`http://localhost:3000${path}`, {
          method: "POST",
        }),
      )?.status,
    ).toBe(403);
  },
);
it.each([CORRIDOR_PATH, RECOMMENDATION_PATH])(
  "allows guest %s POST only with the trusted origin",
  (path) => {
    const url = `http://localhost:3000${path}`;
    expect(
      checkApi(
        new NextRequest(url, {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).toBeUndefined();
    expect(
      checkApi(
        new NextRequest(url, {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      )?.status,
    ).toBe(403);
  },
);
