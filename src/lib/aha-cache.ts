import { getEnv } from "./env";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number; // After this time, data is stale but still usable
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getCacheKey(url: string, params?: Record<string, string>): string {
  const paramStr = params ? JSON.stringify(params, Object.keys(params).sort()) : "";
  return `${url}:${paramStr}`;
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = Date.now();
  // Hard expired — purge
  if (now > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // Stale — return null (caller should use getStaleFromCache for stale data)
  if (now > entry.staleAt) {
    return null;
  }
  return entry.data;
}

/** Returns stale data even if past TTL (but not past hard expiry). */
export function getStaleFromCache<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { data: entry.data, isStale: now > entry.staleAt };
}

export function setInCache<T>(key: string, data: T, ttlSeconds?: number): void {
  const ttl = ttlSeconds ?? getEnv().CACHE_TTL_SECONDS;
  const now = Date.now();
  cache.set(key, {
    data,
    staleAt: now + ttl * 1000,          // Fresh for TTL
    expiresAt: now + ttl * 1000 * 5,    // Keep stale data 5× longer
  });
}

export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}
