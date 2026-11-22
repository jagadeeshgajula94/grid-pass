import { afterEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { authenticatedApi } from "../src/lib/api-http";
import * as auth from "../src/services/auth.service";
import { plannerCookie } from "./planner-test-helpers";
const BASE = "http://localhost:3000";
const EVENT = "test.private_action";

afterEach(() => vi.restoreAllMocks());
it.each(["", "gp_session=tampered"])(
  "keeps the authenticated action seam closed for %s",
  async (cookie) => {
    const handle = vi.fn(async () => NextResponse.json({ accepted: true }));
    const response = await authenticatedApi(
      new Request(BASE, { headers: { cookie } }),
      EVENT,
      handle,
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Authentication required" });
    expect(handle).not.toHaveBeenCalled();
  },
);
it("permits an authenticated action only after an active session check", async () => {
  const handle = vi.fn(async () => NextResponse.json({ accepted: true }));
  const response = await authenticatedApi(
    new Request(BASE, {
      headers: { cookie: await plannerCookie() },
    }),
    EVENT,
    handle,
  );
  expect(response.status).toBe(200);
  expect(handle).toHaveBeenCalledWith(expect.any(String));
});
it("safely maps unexpected authentication failures", async () => {
  vi.spyOn(auth, "getCurrentUser").mockRejectedValue(new Error("private"));
  const handle = vi.fn(async () => NextResponse.json({ accepted: true }));
  const response = await authenticatedApi(new Request(BASE), EVENT, handle);
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Something went wrong" });
  expect(handle).not.toHaveBeenCalled();
});
