import { beforeEach, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  registerSchema,
  loginSchema,
  PASSWORD_RULES,
} from "../src/validation/auth.schema";
import { SlidingWindowLimiter } from "../src/lib/sliding-window-limiter";
import { safeNext } from "../src/lib/safe-next";
import { logEvent } from "../src/lib/logger";
import { InMemorySessionRepository } from "../src/repositories/session.repository";
import { InMemoryUserRepository } from "../src/repositories/user.repository";
import { resetMockStore, getMockStore } from "../src/db/mock-store";
import {
  verifySessionToken,
  createSession,
  activeSession,
  revokeSession,
} from "../src/services/session.service";
import { env } from "../src/lib/env";
const REQUEST_ID = "request-id";

beforeEach(resetMockStore);
it.each(["प्रिया शर्मा", "Priya Nair", "Jose\u0301 Silva"])(
  "accepts letters with combining marks in full name %s",
  (fullName) => {
    expect(registerSchema.shape.fullName.parse(fullName)).toBe(fullName);
  },
);
it.each(["", "<script>", "Owner123"])(
  "rejects invalid full name %s",
  (fullName) => {
    expect(registerSchema.shape.fullName.safeParse(fullName).success).toBe(
      false,
    );
  },
);
it("exports password rules and strict normalized schemas", () => {
  expect(PASSWORD_RULES.every((rule) => rule.test("ValidExample123!"))).toBe(
    true,
  );
  expect(PASSWORD_RULES.some((rule) => rule.test(""))).toBe(false);
  expect(registerSchema.safeParse({}).success).toBe(false);
  expect(
    loginSchema.parse({ email: " TEST@EXAMPLE.COM ", password: "x" }).email,
  ).toBe("test@example.com");
  expect(
    loginSchema.safeParse({ email: "a@b.com", password: "x", extra: true })
      .success,
  ).toBe(false);
});
it("slides windows, bounds keys and rejects new clients at capacity", () => {
  const limiter = new SlidingWindowLimiter(2, 1000, 1);
  expect(limiter.consume("a".repeat(200), 0).isAllowed).toBe(true);
  expect(limiter.consume("a".repeat(160), 500).isAllowed).toBe(true);
  expect(limiter.consume("a".repeat(160), 600).retryAfter).toBe(1);
  expect(limiter.consume("b", 600).isAllowed).toBe(false);
  expect(limiter.consume("a".repeat(160), 1000).isAllowed).toBe(true);
  expect(limiter.consume("b", 2000).isAllowed).toBe(true);
});
it.each([
  undefined,
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "/\n/evil.example",
])("rejects unsafe next %s", (next) => expect(safeNext(next)).toBe("/map"));
it("allows relative next with query and fragment", () =>
  expect(safeNext("/map?city=delhi#station")).toBe("/map?city=delhi#station"));
it("redacts sensitive nested context and emits required structured fields", () => {
  const stdout = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);
  const stderr = vi
    .spyOn(process.stderr, "write")
    .mockImplementation(() => true);
  logEvent("info", "test.event", REQUEST_ID, {
    email: "private",
    nested: [
      { cookie: "private", token: "private", password: "private", status: 401 },
    ],
  });
  const entry = JSON.parse(String(stdout.mock.calls[0]?.[0]));
  expect(entry.level).toBe("info");
  expect(entry.event).toBe("test.event");
  expect(entry.requestId).toBe(REQUEST_ID);
  expect(JSON.stringify(entry)).not.toContain("private");
  logEvent("error", "test.error", REQUEST_ID);
  expect(stderr).toHaveBeenCalled();
  stdout.mockRestore();
  stderr.mockRestore();
});
it("expires sessions and validates session owner against the signed subject", async () => {
  const repository = new InMemorySessionRepository();
  await repository.create({
    id: "expired",
    userId: "owner",
    expiresAt: new Date(0),
  });
  expect(await repository.findActive("expired", new Date())).toBeNull();
  expect(await repository.findActive("absent", new Date())).toBeNull();
  const token = await createSession("owner");
  expect(await activeSession(token)).toBe("owner");
  const identity = await verifySessionToken(token, env.AUTH_SECRET);
  if (!identity) throw new Error("Expected identity");
  await repository.create({
    id: identity.sessionId,
    userId: "another-owner",
    expiresAt: new Date(Date.now() + 60_000),
  });
  expect(await activeSession(token)).toBeNull();
  await revokeSession(token);
  await revokeSession("bad-token");
  expect(await activeSession("bad-token")).toBeNull();
});
it("rejects short secrets, expired or missing claims, and tampered JWTs", async () => {
  expect(await verifySessionToken("x", "short")).toBeNull();
  const key = new TextEncoder().encode(env.AUTH_SECRET);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("gridpass")
    .setAudience("gridpass-web")
    .setIssuedAt()
    .setExpirationTime("1h")
    .setSubject("")
    .setJti("")
    .sign(key);
  expect(await verifySessionToken(token, env.AUTH_SECRET)).toBeNull();
  expect(await verifySessionToken(`${token}x`, env.AUTH_SECRET)).toBeNull();
  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(0)
    .sign(key);
  expect(await verifySessionToken(expired, env.AUTH_SECRET)).toBeNull();
});
it("returns absent users and shares lazy seeding", async () => {
  const repository = new InMemoryUserRepository();
  expect(await repository.findById("absent")).toBeNull();
  const [first, second] = await Promise.all([getMockStore(), getMockStore()]);
  expect(first).toBe(second);
  expect(first.users.size).toBe(3);
});
