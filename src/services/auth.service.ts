import { AppError } from "../lib/errors";
import { legacyPack } from "../domain/ev-catalogue";
import type { Result } from "../lib/result";
import {
  InMemoryUserRepository,
  type UserRepository,
  type User,
} from "../repositories/user.repository";
import type { RegisterInput, LoginInput } from "../validation/auth.schema";
import { hashPassword, verifyPassword, DUMMY_HASH } from "./password.service";
import { activeSession, createSession, revokeSession } from "./session.service";

export interface UserDto {
  fullName: string;
  email: string;
  phone: string;
  evModel: string;
  variantId?: string;
  packConfirmed?: boolean;
}
interface Authenticated {
  user: UserDto;
  token: string;
}
const users: UserRepository = new InMemoryUserRepository();

function toDto(user: User): UserDto {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    evModel: user.evModel,
    variantId: user.packConfirmed
      ? user.variantId
      : legacyPack(user.evModel)?.pack.id,
    packConfirmed: user.packConfirmed ?? false,
  };
}

export async function register(
  input: RegisterInput,
  previousToken = "",
): Promise<Result<Authenticated, AppError>> {
  const { password, ...profile } = input;
  const result = await users.create({
    ...profile,
    packConfirmed: !!profile.variantId,
    passwordHash: await hashPassword(password),
  });
  if (!result.ok) return result;
  return authenticateUser(result.value, previousToken);
}

export async function login(
  input: LoginInput,
  previousToken = "",
): Promise<Result<Authenticated, AppError>> {
  const user = await users.findByEmail(input.email);
  const matches = await verifyPassword(
    user?.passwordHash ?? DUMMY_HASH,
    input.password,
  );
  if (!user || !matches)
    return {
      ok: false,
      error: new AppError("INVALID_CREDENTIALS", "Invalid email or password"),
    };
  return authenticateUser(user, previousToken);
}

async function authenticateUser(
  user: User,
  previousToken: string,
): Promise<Result<Authenticated, AppError>> {
  await revokeSession(previousToken);
  return {
    ok: true,
    value: { user: toDto(user), token: await createSession(user.id) },
  };
}

export async function logout(token: string): Promise<void> {
  await revokeSession(token);
}

export async function getCurrentUser(
  token: string,
): Promise<Result<UserDto, AppError>> {
  const userId = await activeSession(token);
  const user = userId ? await users.findById(userId) : null;
  if (!user)
    return {
      ok: false,
      error: new AppError("UNAUTHENTICATED", "Authentication required"),
    };
  return { ok: true, value: toDto(user) };
}
