import { env } from "../lib/env";
import { hash, argon2id } from "argon2";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  evModel: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}
interface MockStore {
  users: Map<string, User>;
  sessions: Map<string, Session>;
  seed?: Promise<void>;
}
const shared = globalThis as typeof globalThis & { gridPassStore?: MockStore };
export const mockStore: MockStore = (shared.gridPassStore ??= {
  users: new Map(),
  sessions: new Map(),
});

async function seedUsers(): Promise<void> {
  if (env.NODE_ENV === "production" || !env.MOCK_USER_PASSWORD) return;
  const passwordHash = await hash(env.MOCK_USER_PASSWORD, {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const owners = [
    ["Aarav Sharma", "aarav@example.com", "Tata Nexon EV"],
    ["Priya Nair", "priya@example.com", "Mahindra XUV 9e"],
    ["Rohan Mehta", "rohan@example.com", "MG ZS EV"],
  ] as const;
  for (const [fullName, email, evModel] of owners) {
    const id = crypto.randomUUID();
    mockStore.users.set(id, {
      id,
      fullName,
      email,
      evModel,
      phone: "+919876543210",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function getMockStore(): Promise<MockStore> {
  mockStore.seed ??= seedUsers();
  await mockStore.seed;
  return mockStore;
}

export async function resetMockStore(): Promise<void> {
  await mockStore.seed;
  mockStore.users.clear();
  mockStore.sessions.clear();
  mockStore.seed = undefined;
}
