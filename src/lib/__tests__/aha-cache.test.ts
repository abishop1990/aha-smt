import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCacheKey,
  getFromCache,
  getStaleFromCache,
  setInCache,
  invalidateCache,
  clearCache,
} from "@/lib/aha-cache";

describe("aha-cache", () => {
  beforeEach(() => {
    clearCache();
    vi.useRealTimers();
  });

  describe("getCacheKey", () => {
    it("produces consistent keys for same inputs", () => {
      const url = "https://example.com/api/test";
      const params = { foo: "bar", baz: "qux" };

      const key1 = getCacheKey(url, params);
      const key2 = getCacheKey(url, params);

      expect(key1).toBe(key2);
    });

    it("produces different keys for different URLs", () => {
      const params = { foo: "bar" };

      const key1 = getCacheKey("https://example.com/api/test1", params);
      const key2 = getCacheKey("https://example.com/api/test2", params);

      expect(key1).not.toBe(key2);
    });

    it("produces different keys for different params", () => {
      const url = "https://example.com/api/test";

      const key1 = getCacheKey(url, { foo: "bar" });
      const key2 = getCacheKey(url, { foo: "baz" });

      expect(key1).not.toBe(key2);
    });

    it("produces different keys when params are missing", () => {
      const url = "https://example.com/api/test";

      const key1 = getCacheKey(url);
      const key2 = getCacheKey(url, { foo: "bar" });

      expect(key1).not.toBe(key2);
    });

    it("sorts params keys for consistency", () => {
      const url = "https://example.com/api/test";

      const key1 = getCacheKey(url, { a: "1", b: "2", c: "3" });
      const key2 = getCacheKey(url, { c: "3", a: "1", b: "2" });

      expect(key1).toBe(key2);
    });
  });

  describe("setInCache and getFromCache", () => {
    it("stores and retrieves data successfully", () => {
      const key = "test-key";
      const data = { foo: "bar", baz: 123 };

      setInCache(key, data, 60);
      const retrieved = getFromCache<typeof data>(key);

      expect(retrieved).toEqual(data);
    });

    it("returns null for missing key", () => {
      const retrieved = getFromCache("non-existent-key");

      expect(retrieved).toBeNull();
    });

    it("handles different data types", () => {
      setInCache("string", "test", 60);
      setInCache("number", 42, 60);
      setInCache("boolean", true, 60);
      setInCache("array", [1, 2, 3], 60);
      setInCache("object", { a: 1, b: 2 }, 60);

      expect(getFromCache("string")).toBe("test");
      expect(getFromCache("number")).toBe(42);
      expect(getFromCache("boolean")).toBe(true);
      expect(getFromCache("array")).toEqual([1, 2, 3]);
      expect(getFromCache("object")).toEqual({ a: 1, b: 2 });
    });
  });

  describe("TTL expiration", () => {
    it("returns null after TTL expires", () => {
      vi.useFakeTimers();

      const key = "test-key";
      const data = { foo: "bar" };

      setInCache(key, data, 1); // 1 second TTL

      // Data should be available immediately
      expect(getFromCache(key)).toEqual(data);

      // Advance time past staleAt (1s)
      vi.advanceTimersByTime(2000);

      // Data should be stale (getFromCache returns null)
      expect(getFromCache(key)).toBeNull();
    });

    it("respects custom TTL over default", () => {
      vi.useFakeTimers();

      const key = "test-key";
      const data = { foo: "bar" };

      setInCache(key, data, 5); // 5 second TTL

      // Advance time by 3 seconds (less than custom TTL)
      vi.advanceTimersByTime(3000);

      // Data should still be fresh
      expect(getFromCache(key)).toEqual(data);

      // Advance time by another 3 seconds (total 6 seconds, past staleAt)
      vi.advanceTimersByTime(3000);

      // Data should be stale
      expect(getFromCache(key)).toBeNull();
    });

    it("stale data is still available via getStaleFromCache", () => {
      vi.useFakeTimers();

      const key = "test-key";
      const data = { foo: "bar" };

      setInCache(key, data, 1); // 1 second fresh TTL

      // Advance past staleAt but within expiresAt (5x TTL)
      vi.advanceTimersByTime(2000);

      // Fresh check returns null
      expect(getFromCache(key)).toBeNull();

      // Stale check returns the data
      const stale = getStaleFromCache<typeof data>(key);
      expect(stale).not.toBeNull();
      expect(stale!.data).toEqual(data);
      expect(stale!.isStale).toBe(true);
    });

    it("hard-expires data after 5x TTL", () => {
      vi.useFakeTimers();

      const key = "test-key";
      const data = { foo: "bar" };

      setInCache(key, data, 1); // 1s fresh, 5s hard expire

      // Advance past hard expiry (5s)
      vi.advanceTimersByTime(6000);

      // Both fresh and stale should be null
      expect(getFromCache(key)).toBeNull();
      expect(getStaleFromCache(key)).toBeNull();
    });
  });

  describe("invalidateCache", () => {
    it("removes entries matching pattern", () => {
      setInCache("/api/features/1", { id: 1 }, 60);
      setInCache("/api/features/2", { id: 2 }, 60);
      setInCache("/api/releases/1", { id: 3 }, 60);

      invalidateCache("/features/");

      expect(getFromCache("/api/features/1")).toBeNull();
      expect(getFromCache("/api/features/2")).toBeNull();
      expect(getFromCache("/api/releases/1")).toEqual({ id: 3 });
    });

    it("removes multiple matching entries", () => {
      setInCache("/api/v1/test", { a: 1 }, 60);
      setInCache("/api/v1/test/123", { b: 2 }, 60);
      setInCache("/api/v1/test/456", { c: 3 }, 60);
      setInCache("/api/v2/other", { d: 4 }, 60);

      invalidateCache("/api/v1/test");

      expect(getFromCache("/api/v1/test")).toBeNull();
      expect(getFromCache("/api/v1/test/123")).toBeNull();
      expect(getFromCache("/api/v1/test/456")).toBeNull();
      expect(getFromCache("/api/v2/other")).toEqual({ d: 4 });
    });

    it("does nothing when pattern matches no entries", () => {
      setInCache("key1", { a: 1 }, 60);
      setInCache("key2", { b: 2 }, 60);

      invalidateCache("non-matching-pattern");

      expect(getFromCache("key1")).toEqual({ a: 1 });
      expect(getFromCache("key2")).toEqual({ b: 2 });
    });
  });

  describe("clearCache", () => {
    it("removes all entries", () => {
      setInCache("key1", { a: 1 }, 60);
      setInCache("key2", { b: 2 }, 60);
      setInCache("key3", { c: 3 }, 60);

      clearCache();

      expect(getFromCache("key1")).toBeNull();
      expect(getFromCache("key2")).toBeNull();
      expect(getFromCache("key3")).toBeNull();
    });

    it("allows new entries after clearing", () => {
      setInCache("key1", { a: 1 }, 60);
      clearCache();

      setInCache("key2", { b: 2 }, 60);

      expect(getFromCache("key1")).toBeNull();
      expect(getFromCache("key2")).toEqual({ b: 2 });
    });
  });
});
