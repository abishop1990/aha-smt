import { bench, describe, beforeEach } from "vitest";
import { rateLimitedFetch, __resetRateLimiter } from "@/lib/aha-rate-limiter";

describe("Rate Limiter Performance", () => {
  beforeEach(() => {
    __resetRateLimiter();
  });

  bench("single request (token available)", async () => {
    __resetRateLimiter();
    await rateLimitedFetch();
  });

  bench("burst of 10 requests", async () => {
    __resetRateLimiter();
    const promises = Array.from({ length: 10 }, () => rateLimitedFetch());
    await Promise.all(promises);
  });

  bench("burst of 20 requests (full burst limit)", async () => {
    __resetRateLimiter();
    const promises = Array.from({ length: 20 }, () => rateLimitedFetch());
    await Promise.all(promises);
  });
});
