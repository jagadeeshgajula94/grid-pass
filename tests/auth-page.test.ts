import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import LoginPage from "../src/app/login/page";
import RegisterPage from "../src/app/register/page";
import MapPage from "../src/app/map/page";
import Home from "../src/app/page";
import { login } from "../src/services/auth.service";
import { resetMockStore } from "../src/db/mock-store";
import { verifySessionToken } from "../src/services/session-token";
import { middleware } from "../src/middleware";
import { env } from "../src/lib/env";

const state = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.token ? { value: state.token } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
const pages = [
  () => LoginPage({ searchParams: Promise.resolve({}) }),
  () => RegisterPage(),
];
beforeEach(async () => {
  state.token = "";
  await resetMockStore();
});

async function authenticate(email = "aarav@example.com"): Promise<void> {
  const result = await login({
    email,
    password: env.MOCK_USER_PASSWORD ?? "",
  });
  if (!result.ok) throw result.error;
  state.token = result.value.token;
}
it.each(pages)(
  "redirects an active session from the auth page",
  async (page) => {
    await authenticate();
    await expect(page()).rejects.toThrow("redirect:/map");
  },
);
it("lands directly on the map", () => {
  expect(() => Home()).toThrow("redirect:/map");
});
it.each(["", "tampered"])(
  "renders the guest map with missing or invalid session %s",
  async (token) => {
    state.token = token;
    expect((await MapPage()).props).toEqual({});
  },
);
it("passes the active user's first name and registered EV model to the workspace", async () => {
  for (const [email, firstName] of [
    ["aarav@example.com", "Aarav"],
    ["priya@example.com", "Priya"],
  ] as const) {
    await authenticate(email);
    expect((await MapPage()).props).toEqual({
      firstName,
      evModel: expect.any(String),
    });
  }
});
it("renders both auth pages after store loss despite a valid signed JWT", async () => {
  await authenticate();
  await resetMockStore();
  expect(await verifySessionToken(state.token, env.AUTH_SECRET)).not.toBeNull();
  expect((await MapPage()).props).toEqual({});
  for (const path of ["/login", "/register"]) {
    const response = await middleware(
      new NextRequest(`http://localhost:3000${path}`, {
        headers: { cookie: `gp_session=${state.token}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  }
  for (const page of pages) await expect(page()).resolves.toBeDefined();
});
it.each(["", "tampered"])(
  "renders auth pages for an invalid or missing cookie %s",
  async (token) => {
    state.token = token;
    for (const page of pages) await expect(page()).resolves.toBeDefined();
  },
);
