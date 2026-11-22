import type { NextResponse } from "next/server";
import { handleAuth } from "../../../../lib/auth-http";

export const runtime = "nodejs";
export function GET(request: Request): Promise<NextResponse> {
  return handleAuth(request, "me");
}
