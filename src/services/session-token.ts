import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "gp_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const TOKEN_ISSUER = "gridpass";
export const TOKEN_AUDIENCE = "gridpass-web";
export interface SessionIdentity {
  userId: string;
  sessionId: string;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionIdentity | null> {
  if (secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        requiredClaims: ["sub", "jti", "exp", "iat"],
      },
    );
    if (!payload.sub || !payload.jti) return null;
    return { userId: payload.sub, sessionId: payload.jti };
  } catch {
    return null;
  }
}
