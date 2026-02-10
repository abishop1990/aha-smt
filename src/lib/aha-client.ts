import { getEnv } from "./env";
import { getCacheKey, getFromCache, setInCache, invalidateCache } from "./aha-cache";
import { rateLimitedFetch } from "./aha-rate-limiter";
import type {
  AhaFeature,
  AhaRelease,
  AhaProduct,
  AhaTeam,
  AhaUser,
} from "./aha-types";

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
  options?: { params?: Record<string, string>; method?: string; body?: unknown; noCache?: boolean }
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
    const cached = getFromCache<T>(cacheKey);
    if (cached) return cached;
  }

  await rateLimitedFetch();

  const response = await fetch(url.toString(), {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Aha API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as T;

  if (method === "GET" && !noCache) {
    setInCache(cacheKey, data);
  }

  return data;
}

async function ahaFetchAllPages<T>(
  path: string,
  dataKey: string,
  params?: Record<string, string>
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;

  while (true) {
    const pageParams = { ...params, per_page: "200", page: String(page) };
    const response = await ahaFetch<Record<string, unknown>>(path, { params: pageParams });
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
  const response = await ahaFetch<{ user: AhaUser }>("/me");
  return response.user;
}

export async function listProducts(): Promise<AhaProduct[]> {
  return ahaFetchAllPages<AhaProduct>("/products", "products");
}

export async function listReleasesInProduct(productId: string): Promise<AhaRelease[]> {
  return ahaFetchAllPages<AhaRelease>(
    `/products/${productId}/releases`,
    "releases",
    { fields: "id,reference_num,name,start_date,release_date,progress,parking_lot" }
  );
}

export async function getRelease(releaseId: string): Promise<AhaRelease> {
  const response = await ahaFetch<{ release: AhaRelease }>(
    `/releases/${releaseId}`,
    { params: { fields: "id,reference_num,name,start_date,release_date,progress,parking_lot" } }
  );
  return response.release;
}

export async function listFeaturesInRelease(
  releaseId: string,
  options?: { unestimatedOnly?: boolean }
): Promise<AhaFeature[]> {
  const features = await ahaFetchAllPages<AhaFeature>(
    `/releases/${releaseId}/features`,
    "features",
    {
      fields:
        "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at,description",
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
  });
}

export async function listUsersInProduct(productId: string): Promise<AhaUser[]> {
  return ahaFetchAllPages<AhaUser>(
    `/products/${productId}/users`,
    "users",
    { fields: "id,name,email,avatar_url" }
  );
}
