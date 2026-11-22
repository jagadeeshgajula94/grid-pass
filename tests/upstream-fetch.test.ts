import { expect, it, vi } from "vitest";
import { upstreamFetch } from "../src/lib/upstream-fetch";
const URL_ALLOWED = "https://router.project-osrm.org/route";
it.each([
  ["http:", "//router.project-osrm.org/"].join(""),
  "https://127.0.0.1/",
  "https://router.project-osrm.org.evil.test/",
  "https://evil.test/",
  "https://user@router.project-osrm.org/",
  "https://router.project-osrm.org:444/",
])("rejects SSRF target %s before fetching", async (url) => {
  const fetcher = vi.fn<typeof fetch>();
  expect((await upstreamFetch(new URL(url), 100, fetcher)).ok).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});
it("uses redirect rejection and a timeout signal", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ code: "Ok" }));
  expect(await upstreamFetch(new URL(URL_ALLOWED), 4000, fetcher)).toEqual({
    ok: true,
    value: { code: "Ok" },
  });
  expect(fetcher).toHaveBeenCalledWith(
    new URL(URL_ALLOWED),
    expect.objectContaining({
      redirect: "error",
      signal: expect.any(AbortSignal),
    }),
  );
});
it("rejects redirects, bad JSON, HTTP failures and oversized bodies", async () => {
  for (const response of [
    new Response(null, { status: 302 }),
    new Response("broken"),
    new Response(null, { status: 503 }),
    new Response("{}", {
      headers: { "content-length": String(3 * 1024 * 1024) },
    }),
    new Response("x".repeat(2 * 1024 * 1024 + 1)),
  ]) {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    expect((await upstreamFetch(new URL(URL_ALLOWED), 100, fetcher)).ok).toBe(
      false,
    );
  }
});
