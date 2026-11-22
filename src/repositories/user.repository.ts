import { getMockStore, type User } from "../db/mock-store";
export type { User } from "../db/mock-store";
import { AppError } from "../lib/errors";
import type { Result } from "../lib/result";

export type NewUser = Omit<User, "id" | "createdAt" | "updatedAt">;
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: NewUser): Promise<Result<User, AppError>>;
}

export class InMemoryUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const store = await getMockStore();
    return (
      [...store.users.values()].find(
        (user) => user.email === email.toLowerCase(),
      ) ?? null
    );
  }
  async findById(id: string): Promise<User | null> {
    return (await getMockStore()).users.get(id) ?? null;
  }
  async create(input: NewUser): Promise<Result<User, AppError>> {
    const store = await getMockStore();
    const email = input.email.toLowerCase();
    if ([...store.users.values()].some((user) => user.email === email)) {
      return {
        ok: false,
        error: new AppError("EMAIL_TAKEN", "Email already registered"),
      };
    }
    const user: User = {
      ...input,
      email,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.users.set(user.id, user);
    return { ok: true, value: user };
  }
}
