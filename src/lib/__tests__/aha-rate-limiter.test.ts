import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimitedFetch, __resetRateLimiter } from "@/lib/aha-rate-limiter";

describe("aha-rate-limiter", () => {
  beforeEach(() => {
    vi.useRealTimers();
    __resetRateLimiter();
  });

  it("resolves immediately when tokens are available", async () => {
    const start = Date.now();
    await rateLimitedFetch();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it("handles 20 rapid calls without queueing (burst limit)", async () => {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < 20; i++) {
      promises.push(rateLimitedFetch());
    }

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it("queues the 21st rapid call", async () => {
    vi.useFakeTimers();
    __resetRateLimiter();

    // Make 20 calls to exhaust burst tokens
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }

    // The 21st call should be queued
    const queuedPromise = rateLimitedFetch();
    let resolved = false;
    queuedPromise.then(() => {
      resolved = true;
    });

    // Should not resolve immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);

    // Should not resolve after 200ms either
    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(false);

    // Advance time to refill tokens (1000ms total from start)
    await vi.advanceTimersByTimeAsync(800);
    // Need one more tick for the queue processor
    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });

  it("refills burst tokens after 1 second", async () => {
    vi.useFakeTimers();
    __resetRateLimiter();

    // Exhaust burst tokens
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }

    // Advance time by 1100ms to ensure refill (burst window is 1000ms)
    await vi.advanceTimersByTimeAsync(1100);

    // Should be able to make more calls immediately
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }
    // If tokens weren't refilled, the above would hang and timeout
  });

  it("handles multiple refill cycles", async () => {
    vi.useFakeTimers();
    __resetRateLimiter();

    // First burst
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }

    // Refill
    await vi.advanceTimersByTimeAsync(1100);

    // Second burst
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }

    // Refill again
    await vi.advanceTimersByTimeAsync(1100);

    // Third burst should work
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }
    // If this hangs, the test times out — tokens weren't refilled
  });

  it("processes queue gradually as tokens refill", async () => {
    vi.useFakeTimers();
    __resetRateLimiter();

    // Exhaust burst tokens
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }

    // Queue several requests
    const queuedPromises = [
      rateLimitedFetch(),
      rateLimitedFetch(),
      rateLimitedFetch(),
    ];

    let resolvedCount = 0;
    queuedPromises.forEach((p) => p.then(() => resolvedCount++));

    // None should be resolved yet
    await vi.advanceTimersByTimeAsync(0);
    expect(resolvedCount).toBe(0);

    // After 1.5 seconds, tokens refill and queue should process
    await vi.advanceTimersByTimeAsync(1500);
    expect(resolvedCount).toBe(3);
  });

  it("resets state correctly with __resetRateLimiter", async () => {
    // Exhaust burst tokens
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }

    // Reset
    __resetRateLimiter();

    // Should be able to make 20 calls again immediately
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 20; i++) {
      promises.push(rateLimitedFetch());
    }

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it("respects sustained limit over time", async () => {
    vi.useFakeTimers();
    __resetRateLimiter();

    // Make initial burst of 20
    for (let i = 0; i < 20; i++) {
      await rateLimitedFetch();
    }

    // Continue making requests over time
    for (let cycle = 0; cycle < 5; cycle++) {
      await vi.advanceTimersByTimeAsync(1100);

      for (let i = 0; i < 20; i++) {
        await rateLimitedFetch();
      }
    }

    // We've made 120 total requests (6 bursts of 20)
    // This is well within the sustained limit of 300/min
  });
});
