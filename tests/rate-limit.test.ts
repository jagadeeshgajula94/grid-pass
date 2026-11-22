import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/lib/rate-limit";

describe("bounded fixed-window rate limiting", () => {
  it("allows requests below the limit and keeps clients separate", () => {
    const limiter = new RateLimiter(2);
    expect(limiter.consume("first", 0).isAllowed).toBe(true);
    expect(limiter.consume("first", 1).isAllowed).toBe(true);
    expect(limiter.consume("second", 2).isAllowed).toBe(true);
  });

  it("rejects excess requests and rounds retry time up", () => {
    const limiter = new RateLimiter(1);
    limiter.consume("client", 0);
    expect(limiter.consume("client", 1001)).toEqual({
      isAllowed: false,
      retryAfter: 59,
    });
  });

  it("resets the window at expiry", () => {
    const limiter = new RateLimiter(1);
    limiter.consume("client", 0);
    expect(limiter.consume("client", 59_999).isAllowed).toBe(false);
    expect(limiter.consume("client", 60_000).isAllowed).toBe(true);
  });

  it("denies new clients at capacity without evicting active counters", () => {
    const limiter = new RateLimiter(1, 1000, 1);
    limiter.consume("first", 0);
    expect(limiter.consume("second", 1)).toEqual({
      isAllowed: false,
      retryAfter: 1,
    });
    expect(limiter.consume("first", 2).isAllowed).toBe(false);
    expect(limiter.consume("second", 1000).isAllowed).toBe(true);
  });
});
