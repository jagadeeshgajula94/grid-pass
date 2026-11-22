import type { NextRequest } from "next/server";
import { z } from "./zod";

const ipSchema = z.union([z.ipv4(), z.ipv6()]);
const forwardedIpSchema = z
  .string()
  .max(2048)
  .transform((value) => value.split(",")[0]?.trim())
  .pipe(ipSchema);
const realIpSchema = z.string().max(64).trim().pipe(ipSchema);
export function clientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  const result = forwarded
    ? forwardedIpSchema.safeParse(forwarded)
    : realIpSchema.safeParse(request.headers.get("x-real-ip"));
  return result.success ? result.data : "unknown";
}
