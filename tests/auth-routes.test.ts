import { beforeEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { POST as register } from "../src/app/api/auth/register/route";
import { POST as login } from "../src/app/api/auth/login/route";
import { POST as logout } from "../src/app/api/auth/logout/route";
import { GET as me } from "../src/app/api/auth/me/route";
import { resetMockStore } from "../src/db/mock-store";
import { InMemoryUserRepository } from "../src/repositories/user.repository";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

const password = `${randomBytes(18).toString("hex")}aA!`;
const profile = {
  fullName: "Test Owner",
  email: "owner@example.com",
  phone: "+91 98765 43210",
  evModel: "Tata Nexon EV",
  password,
};
const BASE = "http://localhost:3000/api/auth/";
const COOKIE_HEADER = "set-cookie";
function request(action: string, body?: unknown, cookie = ""): Request {
  return new Request(`${BASE}${action}`, {
    method: action === "me" ? "GET" : "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function cookieOf(response: Response): string {
  return response.headers.get(COOKIE_HEADER)?.split(";")[0] ?? "";
}
beforeEach(resetMockStore);

it("logs out a proxied Next route request with browser headers and no body", async () => {
  const registered = await register(request("register", profile));
  const cookie = cookieOf(registered);
  const browserRequest = new NextRequest(`${BASE}logout`, {
    method: "POST",
    headers: { origin: new URL(BASE).origin, cookie },
  });
  expect(browserRequest.headers.has("content-type")).toBe(false);
  expect(browserRequest.body).toBeNull();
  expect((await middleware(browserRequest)).status).toBe(200);
  const proxiedRequest = new Proxy(browserRequest, {
    get: (target, property) => Reflect.get(target, property, target),
  });
  const response = await logout(proxiedRequest);
  expect(response.status).toBe(204);
  expect(response.headers.get(COOKIE_HEADER)).toContain("Max-Age=0");
  expect(await response.text()).toBe("");
  const currentRequest = request("me", undefined, cookie);
  const proxiedCurrent = new Proxy(currentRequest, {
    get: (target, property) => Reflect.get(target, property, target),
  });
  expect((await me(proxiedCurrent)).status).toBe(401);
});

it("registers, logs in, reads allowlisted identity, and revokes on logout", async () => {
  const registered = await register(request("register", profile));
  expect(registered.status).toBe(201);
  const cookie = registered.headers.get(COOKIE_HEADER);
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=lax");
  expect(cookie).toContain("Path=/");
  expect(cookie).toContain("Max-Age=604800");
  const body = await registered.json();
  expect(Object.keys(body.user)).toEqual([
    "fullName",
    "email",
    "phone",
    "evModel",
  ]);
  expect(JSON.stringify(body)).not.toContain("passwordHash");
  expect(body.user.phone).toBe("+919876543210");
  const loggedIn = await login(
    request("login", { email: profile.email, password }),
  );
  expect(loggedIn.status).toBe(200);
  expect(cookieOf(loggedIn)).not.toBe(cookieOf(registered));
  const session = cookieOf(loggedIn);
  expect((await me(request("me", undefined, session))).status).toBe(200);
  const signedOut = await logout(request("logout", undefined, session));
  expect(signedOut.status).toBe(204);
  expect(signedOut.headers.get(COOKIE_HEADER)).toContain("Max-Age=0");
  expect((await me(request("me", undefined, session))).status).toBe(401);
  expect((await me(request("me"))).status).toBe(401);
});
it("rejects duplicate email and normalizes email", async () => {
  expect(
    (
      await register(
        request("register", { ...profile, email: " OWNER@EXAMPLE.COM " }),
      )
    ).status,
  ).toBe(201);
  expect((await register(request("register", profile))).status).toBe(409);
});
it("revokes the previous session on re-login but preserves it on failed login", async () => {
  const original = await register(request("register", profile));
  const oldCookie = cookieOf(original);
  const failed = await login(
    request(
      "login",
      { email: profile.email, password: "incorrect" },
      oldCookie,
    ),
  );
  expect(failed.status).toBe(401);
  expect((await me(request("me", undefined, oldCookie))).status).toBe(200);
  const authenticated = await login(
    request("login", { email: profile.email, password }, oldCookie),
  );
  expect(authenticated.status).toBe(200);
  expect((await me(request("me", undefined, oldCookie))).status).toBe(401);
  expect(
    (await me(request("me", undefined, cookieOf(authenticated)))).status,
  ).toBe(200);
});
it("revokes an existing session when registering another account", async () => {
  const original = await register(request("register", profile));
  const oldCookie = cookieOf(original);
  const registered = await register(
    request(
      "register",
      { ...profile, email: "another@example.com" },
      oldCookie,
    ),
  );
  expect(registered.status).toBe(201);
  expect((await me(request("me", undefined, oldCookie))).status).toBe(401);
  expect(
    (await me(request("me", undefined, cookieOf(registered)))).status,
  ).toBe(200);
});
it.each([
  { ...profile, password: "weak" },
  { ...profile, extra: true },
  {},
  null,
  { ...profile, phone: "+12025550123" },
])("rejects invalid payload %j", async (body) => {
  const response = await register(request("register", body));
  expect(response.status).toBe(400);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("rejects malformed JSON", async () => {
  expect(
    (await register(new Request(BASE, { method: "POST", body: "{" }))).status,
  ).toBe(400);
});
it("equalizes unknown-email and wrong-password errors", async () => {
  await register(request("register", profile));
  const wrong = await login(
    request("login", { email: profile.email, password: "wrong" }),
  );
  const unknown = await login(
    request("login", { email: "unknown@example.com", password }),
  );
  expect(wrong.status).toBe(401);
  expect(unknown.status).toBe(401);
  expect(await wrong.json()).toEqual(await unknown.json());
});
it("logs a seeded owner in with the environment password", async () => {
  const response = await login(
    request("login", {
      email: "aarav@example.com",
      password: process.env.MOCK_USER_PASSWORD,
    }),
  );
  expect(response.status).toBe(200);
  expect((await response.json()).user.fullName).toBe("Aarav Sharma");
});
it("maps unexpected repository failures to generic 500", async () => {
  const spy = vi
    .spyOn(InMemoryUserRepository.prototype, "findByEmail")
    .mockRejectedValueOnce(new Error("private details"));
  const response = await login(
    request("login", { email: profile.email, password }),
  );
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Something went wrong" });
  spy.mockRestore();
});
