import { AppError } from "./errors";
import type { Result } from "./result";

const HOSTS = new Set([
  "nominatim.openstreetmap.org",
  "router.project-osrm.org",
  "api.openchargemap.io",
]);
const MAX_BYTES = 2 * 1024 * 1024;
export async function readLimited(
  response: Response,
  maxBytes = MAX_BYTES,
): Promise<unknown> {
  if (
    Number(response.headers.get("content-length")) > maxBytes ||
    !response.body
  )
    throw new Error("Invalid response size");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maxBytes) throw new Error("Oversized response");
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export async function upstreamFetch(
  url: URL,
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
  headers: Record<string, string> = {},
): Promise<Result<unknown, AppError>> {
  try {
    if (
      url.protocol !== "https:" ||
      !HOSTS.has(url.hostname) ||
      url.port ||
      url.username ||
      url.password
    )
      throw new Error("Invalid upstream host");
    const response = await fetcher(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok || response.redirected)
      throw new Error("Upstream failure");
    return { ok: true, value: await readLimited(response) };
  } catch {
    return {
      ok: false,
      error: new AppError("UPSTREAM_UNAVAILABLE", "Provider unavailable"),
    };
  }
}
