import { NextResponse, type NextRequest } from "next/server";
import { RateLimiter } from "./lib/rate-limit";

const apiLimiter = new RateLimiter();

function limitApiRequest(request: NextRequest): NextResponse | undefined {
  if (!request.nextUrl.pathname.startsWith("/api/")) return undefined;
  const client = (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).slice(0, 128);
  const result = apiLimiter.consume(client);
  if (result.isAllowed) return undefined;
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = btoa(crypto.randomUUID());
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response =
    limitApiRequest(request) ?? NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
