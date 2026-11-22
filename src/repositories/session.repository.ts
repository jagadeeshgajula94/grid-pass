import { getMockStore, type Session } from "../db/mock-store";

export interface SessionRepository {
  create(session: Session): Promise<void>;
  findActive(id: string, now: Date): Promise<Session | null>;
  delete(id: string): Promise<void>;
}
export class InMemorySessionRepository implements SessionRepository {
  async create(session: Session): Promise<void> {
    (await getMockStore()).sessions.set(session.id, session);
  }
  async findActive(id: string, now: Date): Promise<Session | null> {
    const store = await getMockStore();
    const session = store.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= now) {
      store.sessions.delete(id);
      return null;
    }
    return session;
  }
  async delete(id: string): Promise<void> {
    (await getMockStore()).sessions.delete(id);
  }
}
