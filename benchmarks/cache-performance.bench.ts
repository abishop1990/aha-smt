import { bench, describe, beforeEach } from "vitest";
import {
  setInCache,
  getFromCache,
  getCacheKey,
  invalidateCache,
  clearCache,
} from "@/lib/aha-cache";
import { vi } from "vitest";

// Mock getEnv so setInCache doesn't need real env
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ CACHE_TTL_SECONDS: 60 }),
}));

describe("Cache Performance", () => {
  beforeEach(() => {
    clearCache();
  });

  bench("getCacheKey generation", () => {
    getCacheKey("https://example.aha.io/api/v1/releases/123/features", {
      fields: "id,name,score",
      per_page: "200",
    });
  });

  bench("setInCache single entry", () => {
    setInCache("bench-key-" + Math.random(), { data: "value" }, 60);
  });

  bench("getFromCache - hit", () => {
    setInCache("hit-key", { data: "value" }, 60);
    getFromCache("hit-key");
  });

  bench("getFromCache - miss", () => {
    getFromCache("nonexistent-key-" + Math.random());
  });

  bench("setInCache + getFromCache round-trip", () => {
    const key = "round-trip-key";
    setInCache(key, { features: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Feature ${i}` })) }, 60);
    getFromCache(key);
  });

  bench("invalidateCache with pattern (100 entries)", () => {
    // Pre-populate
    for (let i = 0; i < 100; i++) {
      setInCache(`/releases/rel-${i}/features:{}`, { data: i }, 60);
    }
    invalidateCache("/releases/rel-50");
  });

  bench("invalidateCache with pattern (1000 entries)", () => {
    for (let i = 0; i < 1000; i++) {
      setInCache(`/releases/rel-${i}/features:{}`, { data: i }, 60);
    }
    invalidateCache("/releases/rel-500");
  });

  bench("clearCache (1000 entries)", () => {
    for (let i = 0; i < 1000; i++) {
      setInCache(`key-${i}`, { data: i }, 60);
    }
    clearCache();
  });
});
