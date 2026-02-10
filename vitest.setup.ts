import { beforeEach } from "vitest";
import { clearCache } from "@/lib/aha-cache";
import { __resetRateLimiter } from "@/lib/aha-rate-limiter";
import { __resetEnv } from "@/lib/env";

beforeEach(() => {
  clearCache();
  __resetRateLimiter();
  __resetEnv();
});
