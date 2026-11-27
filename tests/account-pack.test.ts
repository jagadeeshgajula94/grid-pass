import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/auth/me/route";
import { middleware } from "../src/middleware";
import { resetLimiters } from "../src/lib/middleware-security";
import { resetMockStore } from "../src/db/mock-store";
import {
  register,
  getCurrentUser,
  logout,
  confirmPack,
} from "../src/services/auth.service";
import * as auth from "../src/services/auth.service";
import { InMemoryUserRepository } from "../src/repositories/user.repository";
import { AppError } from "../src/lib/errors";
const BASE = "http://localhost:3000";
const VARIANT = "tata-nexon-ev-45";
const profile = {
  fullName: "Pack Owner",
  email: "pack@example.com",
  phone: "+919876543210",
  evModel: "Tata Nexon EV" as const,
  password: "PackTestPassword123!",
};
beforeEach(() => {
  resetMockStore();
  resetLimiters();
});
afterEach(() => vi.restoreAllMocks());
async function owner(evModel = profile.evModel as string): Promise<string> {
  const result = await register({
    ...profile,
    evModel: evModel as typeof profile.evModel,
  });
  if (!result.ok) throw result.error;
  return result.value.token;
}
function request(
  token: string,
  body: unknown = { variantId: VARIANT },
  origin = BASE,
): NextRequest {
  return new NextRequest(BASE + "/api/auth/me", {
    method: "POST",
    headers: {
      origin,
      cookie: `gp_session=${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
it("confirms only the active account's pack, persists it, and exposes no private fields", async () => {
  const token = await owner();
  const other = await register({ ...profile, email: "other@example.com" });
  const response = await POST(request(token));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const payload = await response.json();
  expect(payload.user).toMatchObject({
    variantId: VARIANT,
    packConfirmed: true,
  });
  expect(payload.user).not.toHaveProperty("passwordHash");
  expect(payload.user).not.toHaveProperty("id");
  expect(await getCurrentUser(token)).toMatchObject({
    ok: true,
    value: { variantId: VARIANT, packConfirmed: true },
  });
  expect(
    await new InMemoryUserRepository().findByEmail(profile.email),
  ).toMatchObject({ variantId: VARIANT, packConfirmed: true });
  expect(other.ok && (await getCurrentUser(other.value.token))).toMatchObject({
    ok: true,
    value: { packConfirmed: false },
  });
});
it("rejects absent, forged and revoked sessions", async () => {
  const token = await owner();
  await logout(token);
  for (const cookie of ["", "tampered", token])
    expect((await POST(request(cookie))).status).toBe(401);
  expect(await confirmPack(token, VARIANT)).toMatchObject({
    ok: false,
    error: { code: "UNAUTHENTICATED" },
  });
});
it("strictly rejects missing, unsupported, cross-model and extra-field input without changing the account", async () => {
  const token = await owner();
  for (const body of [
    {},
    null,
    { variantId: "unlisted" },
    { variantId: "kia-ev6-84" },
    { variantId: VARIANT, userId: "another" },
    { variantId: VARIANT, packConfirmed: true },
  ])
    expect((await POST(request(token, body))).status).toBe(400);
  expect(await getCurrentUser(token)).toMatchObject({
    ok: true,
    value: { packConfirmed: false },
  });
  expect(await confirmPack(token, "unsupported")).toMatchObject({
    ok: false,
    error: { code: "VALIDATION" },
  });
});
it("keeps exact-origin CSRF and the general rate limit on pack updates", async () => {
  const token = await owner();
  for (const origin of ["", "null", "https://evil.example"])
    expect(middleware(request(token, undefined, origin)).status).toBe(403);
  expect(middleware(request(token)).status).toBe(200);
  let status = 200;
  for (let i = 0; i < 60; i++) status = middleware(request(token)).status;
  expect(status).toBe(429);
});
it("handles legacy aliases and refuses writes to a missing user", async () => {
  const token = await owner("Mahindra XUV 9e");
  expect(
    (await POST(request(token, { variantId: "mahindra-xev-9e-79" }))).status,
  ).toBe(200);
  expect(await getCurrentUser(token)).toMatchObject({
    value: { evModel: "Mahindra XEV 9e", packConfirmed: true },
  });
  expect(
    await new InMemoryUserRepository().updatePack("missing", {
      variantId: VARIANT,
      packConfirmed: true,
      evModel: profile.evModel,
    }),
  ).toBeNull();
});
it("fails safely if the session vanishes or persistence fails", async () => {
  const token = await owner();
  vi.spyOn(auth, "confirmPack").mockResolvedValueOnce({
    ok: false,
    error: new AppError("UNAUTHENTICATED", "Authentication required"),
  });
  expect((await POST(request(token))).status).toBe(401);
  vi.spyOn(
    InMemoryUserRepository.prototype,
    "updatePack",
  ).mockResolvedValueOnce(null);
  expect((await POST(request(token))).status).toBe(401);
  vi.spyOn(
    InMemoryUserRepository.prototype,
    "updatePack",
  ).mockRejectedValueOnce(new Error("private database failure"));
  const response = await POST(request(token));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Something went wrong" });
});
