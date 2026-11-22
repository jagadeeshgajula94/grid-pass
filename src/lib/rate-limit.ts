interface RequestWindow {
  count: number;
  resetsAt: number;
}

interface RateLimitResult {
  isAllowed: boolean;
  retryAfter: number;
}

export class RateLimiter {
  private readonly windows = new Map<string, RequestWindow>();

  constructor(
    private readonly limit = 60,
    private readonly windowMs = 60_000,
    private readonly maxClients = 10_000,
  ) {}

  consume(client: string, now = Date.now()): RateLimitResult {
    const current = this.windows.get(client);
    if (current && now < current.resetsAt) {
      if (current.count >= this.limit) {
        return {
          isAllowed: false,
          retryAfter: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
        };
      }
      current.count += 1;
      return { isAllowed: true, retryAfter: 0 };
    }
    this.removeExpired(now);
    if (this.windows.size >= this.maxClients) {
      return { isAllowed: false, retryAfter: Math.ceil(this.windowMs / 1000) };
    }
    this.windows.set(client, { count: 1, resetsAt: now + this.windowMs });
    return { isAllowed: true, retryAfter: 0 };
  }

  private removeExpired(now: number): void {
    for (const [client, window] of this.windows) {
      if (now >= window.resetsAt) this.windows.delete(client);
    }
  }
}
