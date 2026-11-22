import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError } from "./errors";
import { logEvent } from "./logger";
import { readApiBody } from "./request-body";
import { loginSchema, registerSchema } from "../validation/auth.schema";
import {
  login,
  register,
  logout,
  getCurrentUser,
} from "../services/auth.service";
import { sessionCookieOptions } from "../services/session.service";
import { SESSION_COOKIE } from "../services/session-token";

const RESPONSE_HEADERS = { "Cache-Control": "no-store" };
export function requestToken(request: Request): string {
  const cookie = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1) ?? "";
}
function errorResponse(error: AppError): NextResponse {
  const statuses = {
    VALIDATION: 400,
    EMAIL_TAKEN: 409,
    INVALID_CREDENTIALS: 401,
    UNAUTHENTICATED: 401,
    UPSTREAM_UNAVAILABLE: 503,
  };
  return NextResponse.json(
    { error: error.message },
    { status: statuses[error.code], headers: RESPONSE_HEADERS },
  );
}
function validationResponse(error?: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid request",
      fields: error ? error.flatten().fieldErrors : {},
    },
    { status: 400, headers: RESPONSE_HEADERS },
  );
}
async function authenticate(
  request: Request,
  kind: "login" | "register",
): Promise<NextResponse> {
  const body = await readApiBody(request);
  const schema = kind === "login" ? loginSchema : registerSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationResponse(parsed.error);
  const result =
    kind === "login"
      ? await login(loginSchema.parse(parsed.data), requestToken(request))
      : await register(
          registerSchema.parse(parsed.data),
          requestToken(request),
        );
  if (!result.ok) return errorResponse(result.error);
  const response = NextResponse.json(
    { user: result.value.user },
    { status: kind === "register" ? 201 : 200, headers: RESPONSE_HEADERS },
  );
  response.cookies.set(
    SESSION_COOKIE,
    result.value.token,
    sessionCookieOptions,
  );
  return response;
}
export async function handleAuth(
  request: Request,
  action: "register" | "login" | "logout" | "me",
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const response = await dispatch(request, action);
    logEvent("info", `auth.${action}`, requestId, { status: response.status });
    return response;
  } catch {
    logEvent("error", "auth.unexpected", requestId);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
async function dispatch(
  request: Request,
  action: "register" | "login" | "logout" | "me",
): Promise<NextResponse> {
  if (action === "login" || action === "register")
    return authenticate(request, action);
  const token = requestToken(request);
  if (action === "logout") {
    await logout(token);
    const response = new NextResponse(null, {
      status: 204,
      headers: RESPONSE_HEADERS,
    });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions,
      maxAge: 0,
    });
    return response;
  }
  const result = await getCurrentUser(token);
  return result.ok
    ? NextResponse.json({ user: result.value }, { headers: RESPONSE_HEADERS })
    : errorResponse(result.error);
}
