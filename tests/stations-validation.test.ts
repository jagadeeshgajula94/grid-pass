import { expect, it } from "vitest";
import { nearbyQuerySchema } from "../src/validation/stations.schema";
const center = { lat: "17.385", lng: "78.4867" };
it("coerces strings and supplies defaults", () => {
  expect(nearbyQuerySchema.parse(center)).toEqual({
    lat: 17.385,
    lng: 78.4867,
    radiusKm: 5,
  });
  expect(
    nearbyQuerySchema.parse({ ...center, availableOnly: "false", minKw: "0" })
      .availableOnly,
  ).toBe(false);
  expect(
    nearbyQuerySchema.parse({
      lat: "-90",
      lng: "180",
      radiusKm: "50",
      minKw: "400",
      connector: "CCS2",
      network: "zeon",
      availableOnly: "true",
    }).availableOnly,
  ).toBe(true);
});
it.each([
  { lat: "91" },
  { lng: "-181" },
  { radiusKm: "0" },
  { radiusKm: "51" },
  { minKw: "401" },
  { minKw: "-1" },
  { network: "evil" },
  { connector: "unknown" },
  { availableOnly: "1" },
  { extra: "x" },
  { lat: "" },
  { lat: "Infinity" },
])("rejects invalid queries %j", (patch) => {
  expect(nearbyQuerySchema.safeParse({ ...center, ...patch }).success).toBe(
    false,
  );
});
