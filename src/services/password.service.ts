import { argon2id, hash, verify } from "argon2";

export function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

// Public dummy hash; never corresponds to an application account.
export const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$BQQm07KHA2nfWwhhPz4Acw$FjCFM4IHeAwzHTq4w1gW9pQbaCrdMgaL1FdUkLkY2ow";
