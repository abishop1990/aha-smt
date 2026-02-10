import { getEnv } from "./env";
import { getCacheKey, getFromCache, getStaleFromCache, setInCache, invalidateCache } from "./aha-cache";
import { rateLimitedFetch } from "./aha-rate-limiter";
import type {
  AhaFeature,
  AhaRelease,
  AhaProduct,
  AhaTeam,
  AhaUser,
} from "./aha-types";

// Track in-flight background refreshes to avoid duplicates
const pendingRefreshes = new Set<string>();

// Deduplicate concurrent identical GET requests
const inflight = new Map<string, Promise<unknown>>();

async function refreshInBackground<T>(
  urlStr: string,
  method: string,
  body: unknown,
  cacheKey: string,
): Promise<void> {
  if (pendingRefreshes.has(cacheKey)) return;
  pendingRefreshes.add(cacheKey);

  try {
    await rateLimitedFetch();
    const response = await fetch(urlStr, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      keepalive: true,
    });
    if (response.ok) {
      const data = (await response.json()) as T;
      setInCache(cacheKey, data);
    }
  } catch {
    // Silently fail — stale data was already served
  } finally {
    pendingRefreshes.delete(cacheKey);
  }
}

function getBaseUrl(): string {
  const { AHA_DOMAIN } = getEnv();
  return `https://${AHA_DOMAIN}.aha.io/api/v1`;
}

function getHeaders(): HeadersInit {
  const { AHA_API_TOKEN } = getEnv();
  return {
    Authorization: `Bearer ${AHA_API_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function ahaFetch<T>(
  path: string,
  options?: { params?: Record<string, string>; method?: string; body?: unknown; noCache?: boolean; cacheTtl?: number }
): Promise<T> {
  const { params, method = "GET", body, noCache = false } = options ?? {};

  const url = new URL(`${getBaseUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const cacheKey = getCacheKey(url.toString());
  if (method === "GET" && !noCache) {
    // Try fresh cache first
    const cached = getFromCache<T>(cacheKey);
    if (cached) return cached;

    // Stale-while-revalidate: serve stale data and refresh in background
    const stale = getStaleFromCache<T>(cacheKey);
    if (stale?.isStale) {
      // Fire background refresh (no await)
      refreshInBackground<T>(url.toString(), method, body, cacheKey);
      return stale.data;
    }

    // Deduplicate concurrent GET requests
    const existing = inflight.get(cacheKey);
    if (existing) return existing as Promise<T>;
  }

  await rateLimitedFetch();

  const fetchPromise = (async () => {
    const response = await fetch(url.toString(), {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      keepalive: true,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Aha API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as T;

    if (method === "GET" && !noCache) {
      setInCache(cacheKey, data, options?.cacheTtl);
    }

    return data;
  })();

  if (method === "GET") {
    inflight.set(cacheKey, fetchPromise);
    // Suppress unhandled rejection on the cleanup chain — callers handle the rejection directly
    fetchPromise.finally(() => inflight.delete(cacheKey)).catch(() => {});
  }

  return fetchPromise;
}

async function ahaFetchAllPages<T>(
  path: string,
  dataKey: string,
  params?: Record<string, string>,
  cacheTtl?: number
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;

  while (true) {
    const pageParams = { ...params, per_page: "200", page: String(page) };
    const response = await ahaFetch<Record<string, unknown>>(path, { params: pageParams, cacheTtl });
    const items = (response[dataKey] as T[]) ?? [];
    allItems.push(...items);

    const pagination = response.pagination as { total_pages: number; current_page: number } | undefined;
    if (!pagination || pagination.current_page >= pagination.total_pages) break;
    page++;
  }

  return allItems;
}

// --- Public API methods ---

export async function getCurrentUser(): Promise<AhaUser> {
  const response = await ahaFetch<{ user: AhaUser }>("/me", { cacheTtl: 300 });
  return response.user;
}

export async function listProducts(): Promise<AhaProduct[]> {
  return ahaFetchAllPages<AhaProduct>("/products", "products", undefined, 300);
}

export async function listReleasesInProduct(productId: string): Promise<AhaRelease[]> {
  return ahaFetchAllPages<AhaRelease>(
    `/products/${productId}/releases`,
    "releases",
    { fields: "id,reference_num,name,start_date,release_date,progress,parking_lot" },
    120
  );
}

export async function getRelease(releaseId: string): Promise<AhaRelease> {
  const response = await ahaFetch<{ release: AhaRelease }>(
    `/releases/${releaseId}`,
    { params: { fields: "id,reference_num,name,start_date,release_date,progress,parking_lot" }, cacheTtl: 120 }
  );
  return response.release;
}

export interface PaginatedFeatures {
  features: AhaFeature[];
  pagination: { total_records: number; total_pages: number; current_page: number; per_page: number };
}

/** Fetch a single page of features (for paginated UI). */
export async function listFeaturesPage(
  releaseId: string,
  page = 1,
  perPage = 200,
): Promise<PaginatedFeatures> {
  const data = await ahaFetch<{
    features: AhaFeature[];
    pagination: PaginatedFeatures["pagination"];
  }>(`/releases/${releaseId}/features`, {
    params: {
      fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at",
      per_page: String(perPage),
      page: String(page),
    },
  });
  return { features: data.features ?? [], pagination: data.pagination };
}

/** Fetch ALL features (all pages aggregated). Use sparingly on large releases. */
export async function listFeaturesInRelease(
  releaseId: string,
  options?: { unestimatedOnly?: boolean }
): Promise<AhaFeature[]> {
  // Lean field set — omit description to cut response size ~50%.
  // Description is fetched per-feature via getFeature() when needed.
  const features = await ahaFetchAllPages<AhaFeature>(
    `/releases/${releaseId}/features`,
    "features",
    {
      fields:
        "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at",
    }
  );

  if (options?.unestimatedOnly) {
    return features.filter((f) => f.score === null || f.score === undefined || f.score === 0);
  }

  return features;
}

export async function getFeature(featureId: string): Promise<AhaFeature> {
  const response = await ahaFetch<{ feature: AhaFeature }>(
    `/features/${featureId}`,
    {
      params: {
        fields:
          "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at,updated_at,description,requirements,release",
      },
    }
  );
  return response.feature;
}

export async function updateFeatureScore(featureId: string, score: number): Promise<AhaFeature> {
  const response = await ahaFetch<{ feature: AhaFeature }>(
    `/features/${featureId}`,
    {
      method: "PUT",
      body: { feature: { score } },
    }
  );
  // Invalidate caches that might contain this feature
  invalidateCache(`/features/${featureId}`);
  invalidateCache("/releases/");
  return response.feature;
}

export async function listTeams(): Promise<AhaTeam[]> {
  return ahaFetchAllPages<AhaTeam>("/project_teams", "project_teams", {
    fields: "id,name,team_members",
  }, 600);
}

export async function listUsersInProduct(productId: string): Promise<AhaUser[]> {
  return ahaFetchAllPages<AhaUser>(
    `/products/${productId}/users`,
    "project_users",
    { fields: "id,name,email,avatar_url" },
    300
  );
}
