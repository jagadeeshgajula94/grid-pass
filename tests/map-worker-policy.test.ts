import { expect, it } from "vitest";
import nextConfig from "../next.config";
it("scopes CARTO worker access to the hashed module asset without unsafe scripts", async () => {
  const headers = await nextConfig.headers?.();
  const worker = headers?.find((entry) =>
    entry.source.includes("maplibre-gl-worker"),
  );
  expect(worker?.source).toBe(
    "/_next/static/media/maplibre-gl-worker.:hash([a-f0-9]+).mjs",
  );
  const policy = worker?.headers.find(
    (header) => header.key === "Content-Security-Policy",
  )?.value;
  expect(policy).toContain("default-src 'none'");
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain(
    "connect-src 'self' https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com",
  );
  expect(policy).not.toContain("unsafe-");
  expect(
    headers
      ?.find((entry) => entry.source === "/:path*")
      ?.headers.find((header) => header.key === "Content-Security-Policy")
      ?.value,
  ).toContain("connect-src 'self';");
});
