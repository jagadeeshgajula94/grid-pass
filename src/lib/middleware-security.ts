import { NextResponse, type NextRequest } from "next/server";
import { RateLimiter } from "./rate-limit";
import { SlidingWindowLimiter } from "./sliding-window-limiter";
import { clientIp } from "./client-ip";
import { hasTrustedOrigin } from "./origin-check";

let apiLimiter = new RateLimiter();
let authLimiter = new SlidingWindowLimiter();
let geocodeLimiter = new SlidingWindowLimiter(30, 60_000);
let corridorLimiter = new SlidingWindowLimiter(10, 60_000);
let recommendationLimiter = new SlidingWindowLimiter(10, 60_000);
const AUTH_PATHS = ["/api/auth/login", "/api/auth/register"];
export function resetLimiters(): void {
  apiLimiter = new RateLimiter();
  authLimiter = new SlidingWindowLimiter();
  geocodeLimiter = new SlidingWindowLimiter(30, 60_000);
  corridorLimiter = new SlidingWindowLimiter(10, 60_000);
  recommendationLimiter = new SlidingWindowLimiter(10, 60_000);
}
function limitedResponse(result: {
  isAllowed: boolean;
  retryAfter: number;
}): NextResponse | undefined {
  if (result.isAllowed) return undefined;
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}
export function checkApi(request: NextRequest): NextResponse | undefined {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/")) return undefined;
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    !hasTrustedOrigin(
      request,
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    )
  )
    return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
  const general = limitedResponse(apiLimiter.consume(clientIp(request)));
  if (general) return general;
  if (path === "/api/geocode/search")
    return limitedResponse(geocodeLimiter.consume(clientIp(request)));
  if (path === "/api/routes/corridor")
    return limitedResponse(corridorLimiter.consume(clientIp(request)));
  if (path === "/api/recommendations/charging")
    return limitedResponse(recommendationLimiter.consume(clientIp(request)));
  if (request.method === "POST" && AUTH_PATHS.includes(path))
    return limitedResponse(authLimiter.consume(`${path}:${clientIp(request)}`));
  return undefined;
}
