import { SignJWT } from "jose";
import { env } from "../lib/env";
import {
  InMemorySessionRepository,
  type SessionRepository,
} from "../repositories/session.repository";
import {
  SESSION_SECONDS,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
  verifySessionToken,
} from "./session-token";

export { verifySessionToken } from "./session-token";
export const sessionRepository: SessionRepository =
  new InMemorySessionRepository();
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: env.NODE_ENV === "production",
  maxAge: SESSION_SECONDS,
} as const;

export async function createSession(userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setJti(id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .sign(new TextEncoder().encode(env.AUTH_SECRET));
  await sessionRepository.create({ id, userId, expiresAt });
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  const identity = await verifySessionToken(token, env.AUTH_SECRET);
  if (identity) await sessionRepository.delete(identity.sessionId);
}

export async function activeSession(token: string): Promise<string | null> {
  const identity = await verifySessionToken(token, env.AUTH_SECRET);
  if (!identity) return null;
  const session = await sessionRepository.findActive(
    identity.sessionId,
    new Date(),
  );
  return session?.userId === identity.userId ? session.userId : null;
}
