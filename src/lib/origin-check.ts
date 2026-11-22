import type { NextRequest } from "next/server";
import { z } from "./zod";

const originSchema = z
  .string()
  .min(1)
  .max(2048)
  .pipe(z.url({ protocol: /^https?$/ }))
  .pipe(z.string().refine((value) => new URL(value).origin === value));
const hostnameSchema = z.union([z.hostname(), z.ipv4()]);
const ipv6Schema = z.ipv6();
function isHost(value: string): boolean {
  if (/[/?#@\\\s]/.test(value) || value.endsWith(":")) return false;
  try {
    const parsed = new URL(`http://${value}`);
    return parsed.hostname.startsWith("[")
      ? ipv6Schema.safeParse(parsed.hostname.slice(1, -1)).success
      : hostnameSchema.safeParse(parsed.hostname).success;
  } catch {
    return false;
  }
}
const hostSchema = z
  .string()
  .min(1)
  .max(259)
  .refine(isHost)
  .transform((value) => new URL(`http://${value}`).host)
  .optional();
export function hasTrustedOrigin(
  request: NextRequest,
  appUrl: string,
): boolean {
  const origin = originSchema.safeParse(request.headers.get("origin"));
  const host = hostSchema.safeParse(request.headers.get("host") ?? undefined);
  if (!origin.success || !host.success) return false;
  try {
    const parsed = new URL(origin.data);
    return parsed.origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
