import { expect, it, vi } from "vitest";
import { HttpOpenChargeMapRepository } from "../src/repositories/open-charge-map.repository";
import { rankRecommendations } from "../src/services/recommendation.service";
import { rangeQuery } from "./range-fixtures";
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
it.each([
  { site: false, port: undefined, expected: "offline" },
  { site: false, port: null, expected: "offline" },
  { site: false, port: {}, expected: "offline" },
  { site: false, port: { IsOperational: null }, expected: "offline" },
  { site: false, port: { IsOperational: true }, expected: "unknown" },
  { site: true, port: { IsOperational: false }, expected: "offline" },
  { site: true, port: undefined, expected: "unknown" },
  { site: undefined, port: undefined, expected: "unknown" },
])(
  "uses site-level operational status only when a port has no operational status: $site / $port",
  async ({ site, port, expected }) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([
        {
          ...poi,
          StatusType: { IsOperational: site },
          Connections: [
            { ConnectionTypeID: 33, PowerKW: 60, StatusType: port },
          ],
        },
      ]),
    );
    const result = await new HttpOpenChargeMapRepository(
      "key",
      fetcher,
    ).findNearby(center, 5);
    if (!result.ok) throw result.error;
    const station = result.value[0];
    if (!station) throw new Error("Missing OCM station");
    expect(station.connectors[0]?.status).toBe(expected);
    const ranked = rankRecommendations(
      [{ station, roadDistanceKm: 1, detourKm: 0, progressKm: 0 }],
      rangeQuery(),
    );
    expect(ranked.recommendations).toHaveLength(expected === "offline" ? 0 : 1);
  },
);
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
const expandedPoi = {
  ID: 192362,
  OperatorID: 3539,
  OperatorInfo: { ID: 3539, Title: "Tata Power" },
  AddressInfo: {
    ID: 192721,
    Title: "Tata Power - Hyderabad Central",
    AddressLine1: "Punjagutta Road",
    Town: "Hyderabad",
    Latitude: center.lat,
    Longitude: center.lng,
  },
  Connections: [
    {
      ConnectionTypeID: 33,
      PowerKW: 60,
      StatusTypeID: 50,
      StatusType: { ID: 50, Title: "Operational", IsOperational: true },
    },
    {
      ConnectionTypeID: 25,
      PowerKW: 22,
      StatusTypeID: 30,
      StatusType: {
        ID: 30,
        Title: "Temporarily Unavailable",
        IsOperational: false,
      },
    },
  ],
  DateLastStatusUpdate: "2026-01-01T00:00:00Z",
};
it("requests expanded OCM data and maps operator and operational metadata", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json([expandedPoi]));
  const result = await new HttpOpenChargeMapRepository(
    "key",
    fetcher,
  ).findNearby(center, 5);
  const url = new URL(String(fetcher.mock.calls[0]?.[0]));
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    compact: "false",
    verbose: "true",
    maxresults: "250",
  });
  expect(result.ok && result.value[0]).toMatchObject({
    network: "tata-power",
    statusSource: "unknown occupancy",
    connectors: [
      { type: "CCS2", status: "unknown" },
      { type: "TYPE2", status: "offline" },
    ],
  });
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
it("expands quantities into independent ports and defaults omitted or null quantities to one", async () => {
  const connections = [
    {
      ConnectionTypeID: 33,
      Quantity: 3,
      PowerKW: 60,
      StatusType: { IsOperational: true },
    },
    { ConnectionTypeID: 25 },
    { ConnectionTypeID: 2, Quantity: null },
    { ConnectionTypeID: 999, Quantity: 2 },
  ];
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json([{ ...poi, Connections: connections }]));
  const result = await new HttpOpenChargeMapRepository(
    "key",
    fetcher,
  ).findNearby(center, 5);
  expect(result.ok).toBe(true);
  if (!result.ok) throw result.error;
  const ports = result.value[0]?.connectors;
  expect(ports?.map((port) => port.type)).toEqual([
    "CCS2",
    "CCS2",
    "CCS2",
    "TYPE2",
    "CHADEMO",
  ]);
  expect(ports?.filter((port) => port.status === "unknown")).toHaveLength(5);
  expect(ports?.[0]).not.toBe(ports?.[1]);
});
it.each([0, 21, 1.5])("rejects invalid port quantity %s", async (Quantity) => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json([
        { ...poi, Connections: [{ ConnectionTypeID: 33, Quantity }] },
      ]),
    );
  const result = await new HttpOpenChargeMapRepository(
    "key",
    fetcher,
  ).findNearby(center, 5);
  expect(result.ok).toBe(false);
});
