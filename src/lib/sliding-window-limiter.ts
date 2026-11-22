interface LimitResult {
  isAllowed: boolean;
  retryAfter: number;
}
export class SlidingWindowLimiter {
  private readonly clients = new Map<string, number[]>();
  constructor(
    private readonly limit = 5,
    private readonly windowMs = 900_000,
    private readonly maxClients = 10_000,
  ) {}
  consume(client: string, now = Date.now()): LimitResult {
    const key = client.slice(0, 160);
    this.removeExpired(now);
    const attempts = this.clients.get(key) ?? [];
    if (attempts.length >= this.limit)
      return {
        isAllowed: false,
        retryAfter: Math.max(
          1,
          Math.ceil(((attempts[0] ?? now) + this.windowMs - now) / 1000),
        ),
      };
    if (!this.clients.has(key) && this.clients.size >= this.maxClients)
      return { isAllowed: false, retryAfter: Math.ceil(this.windowMs / 1000) };
    attempts.push(now);
    this.clients.set(key, attempts);
    return { isAllowed: true, retryAfter: 0 };
  }
  private removeExpired(now: number): void {
    for (const [key, attempts] of this.clients) {
      const active = attempts.filter(
        (attempt) => attempt > now - this.windowMs,
      );
      if (active.length) this.clients.set(key, active);
      else this.clients.delete(key);
    }
  }
}
