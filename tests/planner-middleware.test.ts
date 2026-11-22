import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkApi, resetLimiters } from "../src/lib/middleware-security";
beforeEach(() => {
  resetLimiters();
  vi.stubEnv("TRUST_PROXY_HEADERS", "true");
});
afterEach(() => vi.unstubAllEnvs());
it.each([
  ["/api/geocode/search", 30],
  ["/api/routes/corridor", 10],
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
it("requires the trusted Origin for corridor POST", () => {
  expect(
    checkApi(
      new NextRequest("http://localhost:3000/api/routes/corridor", {
        method: "POST",
      }),
    )?.status,
  ).toBe(403);
});
it("allows guest corridor POST only with the trusted origin", () => {
  const url = "http://localhost:3000/api/routes/corridor";
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
});
