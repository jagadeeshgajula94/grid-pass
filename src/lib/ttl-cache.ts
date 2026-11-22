export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; expires: number }>();
  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (maxEntries < 1 || ttlMs <= 0)
      throw new RangeError("Invalid cache bounds");
  }
  get(key: string): T | undefined {
    this.evictExpired();
    return this.entries.get(key)?.value;
  }
  set(key: string, value: T): void {
    this.evictExpired();
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
  }
  private evictExpired(): void {
    for (const [key, entry] of this.entries)
      if (entry.expires <= this.now()) this.entries.delete(key);
  }
}
