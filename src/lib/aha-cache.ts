import { getEnv } from "./env";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getCacheKey(url: string, params?: Record<string, string>): string {
  const paramStr = params ? JSON.stringify(params, Object.keys(params).sort()) : "";
  return `${url}:${paramStr}`;
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setInCache<T>(key: string, data: T, ttlSeconds?: number): void {
  const ttl = ttlSeconds ?? getEnv().CACHE_TTL_SECONDS;
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl * 1000,
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
