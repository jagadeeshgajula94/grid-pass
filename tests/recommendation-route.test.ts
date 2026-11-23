import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/recommendations/charging/route";
import * as service from "../src/services/recommendation.service";
import { getCurrentUser } from "../src/services/auth.service";
import { requestToken } from "../src/lib/auth-http";
import { recommendationSchema } from "../src/validation/recommendation.schema";
import { plannerCookie } from "./planner-test-helpers";
import {
  assistantResponse,
  nearbyContext,
  NEXON,
} from "./recommendation-fixtures";
const query = { batteryPercent: 35, evModel: NEXON, context: nearbyContext };
function request(body: unknown, cookie = ""): Request {
  return new Request("http://localhost:3000/api/recommendations/charging", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify(body),
  });
}
afterEach(() => vi.restoreAllMocks());
it("allows guests with a model and returns no-store recommendation DTOs", async () => {
  const recommend = vi
    .spyOn(service, "recommendCharging")
    .mockResolvedValue(assistantResponse);
  const response = await POST(request(query));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual(assistantResponse);
  expect(recommend).toHaveBeenCalledWith(query, expect.any(String));
});
it("asks guests for a model but resolves the active session's model from its cookie, overriding the body", async () => {
  const recommend = vi
    .spyOn(service, "recommendCharging")
    .mockResolvedValue(assistantResponse);
  const missing = { ...query, evModel: undefined };
  const response = await POST(request(missing));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("Choose an EV model");
  expect(recommend).not.toHaveBeenCalled();
  const cookie = await plannerCookie();
  const user = await getCurrentUser(requestToken(request(query, cookie)));
  if (!user.ok) throw new Error("Test user is not signed in");
  expect(
    (await POST(request({ ...query, evModel: "Kia EV6" }, cookie))).status,
  ).toBe(200);
  expect(recommend).toHaveBeenLastCalledWith(
    { ...query, evModel: user.value.evModel },
    expect.any(String),
  );
  expect((await POST(request(missing, cookie))).status).toBe(200);
  expect(recommend).toHaveBeenLastCalledWith(
    { ...query, evModel: user.value.evModel },
    expect.any(String),
  );
});
it("rejects malformed and oversized JSON, invalid models, non-finite numbers and extra fields", async () => {
  const recommend = vi
    .spyOn(service, "recommendCharging")
    .mockResolvedValue(assistantResponse);
  const bodies: unknown[] = [
    null,
    {},
    { ...query, batteryPercent: 0 },
    { ...query, batteryPercent: 101 },
    { ...query, batteryPercent: "35" },
    { ...query, batteryPercent: Infinity },
    { ...query, evModel: "unlisted" },
    { ...query, extra: true },
    { ...query, context: { ...nearbyContext, center: { lat: 91, lng: 78 } } },
    { ...query, context: { ...nearbyContext, center: { lat: 17, lng: -181 } } },
    { ...query, context: { ...nearbyContext, extra: true } },
    { ...query, context: { ...nearbyContext, radiusKm: 51 } },
    {
      ...query,
      context: { mode: "area", center: nearbyContext.center, radiusKm: 0 },
    },
  ];
  for (const body of bodies)
    expect((await POST(request(body))).status).toBe(400);
  for (const body of ["bad json", "x".repeat(5000)])
    expect(
      (
        await POST(
          new Request("http://localhost:3000/api/recommendations/charging", {
            method: "POST",
            body,
          }),
        )
      ).status,
    ).toBe(400);
  expect(recommend).not.toHaveBeenCalled();
});
it("validates each context strictly and defaults nearby radius and route buffer to 5", () => {
  const center = nearbyContext.center;
  expect(
    recommendationSchema.parse({
      ...query,
      context: { mode: "nearby", center },
    }).context,
  ).toEqual({ ...nearbyContext, radiusKm: 5 });
  expect(
    recommendationSchema.parse({
      ...query,
      context: { mode: "route", origin: center, destination: center },
    }).context,
  ).toMatchObject({ bufferKm: 5 });
  for (const context of [
    { mode: "area", center },
    { mode: "route", origin: center, destination: center, bufferKm: 16 },
    { mode: "route", origin: center, destination: center, bufferKm: 0 },
    { mode: "unknown", center },
    { mode: "nearby", center: { ...center, extra: true } },
  ])
    expect(recommendationSchema.safeParse({ ...query, context }).success).toBe(
      false,
    );
});
it("returns a safe error on unexpected recommendation failure", async () => {
  vi.spyOn(service, "recommendCharging").mockRejectedValue(
    new Error("private details"),
  );
  const response = await POST(request(query));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Something went wrong" });
});
