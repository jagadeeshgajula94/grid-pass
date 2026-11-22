import { expect, it, vi } from "vitest";
import { HttpOpenChargeMapRepository } from "../src/repositories/open-charge-map.repository";
const center = { lat: 17.385, lng: 78.4867 };
const poi = {
  ID: 1,
  AddressInfo: {
    Title: " <script>alert(1)</script>\u0000 ",
    Latitude: center.lat,
    Longitude: center.lng,
  },
  OperatorInfo: { Title: "Tata Power" },
  Connections: [
    { ConnectionTypeID: 33, PowerKW: 60, StatusType: { IsOperational: true } },
    { ConnectionTypeID: 999 },
  ],
};
it("uses only the fixed host and sanitizes untrusted text without interpreting markup", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([poi]));
  const result = await new HttpOpenChargeMapRepository(
    "test-key",
    fetcher,
  ).findNearby(center, 5);
  expect(result.ok && result.value[0]?.name).toBe("<script>alert(1)</script>");
  expect(result.ok && result.value[0]?.network).toBe("tata-power");
  expect(result.ok && result.value[0]?.connectors).toHaveLength(1);
  expect(new URL(String(fetcher.mock.calls[0]?.[0])).hostname).toBe(
    "api.openchargemap.io",
  );
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    redirect: "error",
    headers: { "X-API-Key": "test-key" },
  });
});
it("does not fetch without a key", async () => {
  const fetcher = vi.fn<typeof fetch>();
  expect(
    await new HttpOpenChargeMapRepository("", fetcher).findNearby(center, 5),
  ).toEqual({ ok: true, value: [] });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  Response.json({ garbage: true }),
  new Response("x".repeat(2 * 1024 * 1024 + 1)),
  new Response("[]", { headers: { "content-length": "3000000" } }),
  new Response("failed", { status: 503 }),
  Response.json([
    { ...poi, Connections: [{ ConnectionTypeID: 33, PowerKW: -1 }] },
  ]),
])("returns an error for invalid upstream responses", async (response) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
  expect(
    (
      await new HttpOpenChargeMapRepository("key", fetcher).findNearby(
        center,
        5,
      )
    ).ok,
  ).toBe(false);
});
it("maps aborts to an error Result", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new DOMException("timeout", "AbortError"));
  expect(
    (
      await new HttpOpenChargeMapRepository("key", fetcher).findNearby(
        center,
        5,
      )
    ).ok,
  ).toBe(false);
});
