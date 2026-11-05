import { getEnv } from "./env";
import { getCacheKey, getFromCache, getStaleFromCache, setInCache, invalidateCache } from "./aha-cache";
import { rateLimitedFetch } from "./aha-rate-limiter";
import type {
  AhaFeature,
  AhaIteration,
  AhaRelease,
  AhaProduct,
  AhaTeam,
  AhaUser,
  AhaEpic,
  IterationMemberCapacity,
  PlanningPokerVote,
} from "./aha-types";
import { isUnestimated } from "./points";

// Track in-flight background refreshes to avoid duplicates
const pendingRefreshes = new Set<string>();

// Deduplicate concurrent identical GET requests
const inflight = new Map<string, Promise<unknown>>();

async function refreshInBackground<T>(
  urlStr: string,
  method: string,
  body: unknown,
  cacheKey: string,
  cacheTtl?: number,
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
      const raw = (await response.json()) as T;
      // For GraphQL responses, unwrap the data field
      const data = (raw as Record<string, unknown>).data !== undefined
        ? (raw as { data: T }).data
        : raw;
      setInCache(cacheKey, data, cacheTtl);
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

function getGraphQLUrl(): string {
  const { AHA_DOMAIN } = getEnv();
  return `https://${AHA_DOMAIN}.aha.io/api/v2/graphql`;
}

async function ahaGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  cacheTtl?: number,
): Promise<T> {
  const cacheKey = getCacheKey(`graphql:${query}:${JSON.stringify(variables ?? {})}`);

  const cached = getFromCache<T>(cacheKey);
  if (cached) return cached;

  const stale = getStaleFromCache<T>(cacheKey);
  if (stale?.isStale) {
    // Serve stale data immediately and refresh in the background
    refreshInBackground<T>(getGraphQLUrl(), "POST", { query, variables }, cacheKey, cacheTtl);
    return stale.data;
  }

  await rateLimitedFetch();

  const response = await fetch(getGraphQLUrl(), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query, variables }),
    keepalive: true,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Aha GraphQL error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (json.errors?.length) {
    throw new Error(`Aha GraphQL error: ${json.errors[0].message}`);
  }

  if (!json.data) {
    throw new Error("Aha GraphQL returned no data");
  }

  setInCache(cacheKey, json.data, cacheTtl);
  return json.data;
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
  return ahaFetchAllPages<AhaProduct>("/products", "products", {
    fields: "id,reference_prefix,name,product_line,workspace_type",
  }, 300);
}

export async function listReleasesInProduct(productId: string): Promise<AhaRelease[]> {
  return ahaFetchAllPages<AhaRelease>(
    `/products/${productId}/releases`,
    "releases",
    { fields: "id,reference_num,name,start_date,release_date,status,progress,parking_lot" },
    120
  );
}

export async function getRelease(releaseId: string): Promise<AhaRelease> {
  const response = await ahaFetch<{ release: AhaRelease }>(
    `/releases/${releaseId}`,
    { params: { fields: "id,reference_num,name,start_date,release_date,status,progress,parking_lot" }, cacheTtl: 120 }
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
      fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,workflow_kind,assigned_to_user,tags,position,created_at",
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
        "id,reference_num,name,score,work_units,original_estimate,workflow_status,workflow_kind,assigned_to_user,tags,position,created_at",
    }
  );

  if (options?.unestimatedOnly) {
    return features.filter(isUnestimated);
  }

  return features;
}

/**
 * Fetch ALL features for a given epic reference number.
 */
export async function listFeaturesForEpic(
  epicRef: string,
  options?: { unestimatedOnly?: boolean }
): Promise<AhaFeature[]> {
  const features = await ahaFetchAllPages<AhaFeature>(
    `/epics/${epicRef}/features`,
    "features",
    {
      fields:
        "id,reference_num,name,score,work_units,original_estimate,workflow_status,workflow_kind,assigned_to_user,tags,position,created_at",
    }
  );
  if (options?.unestimatedOnly) return features.filter(isUnestimated);
  return features;
}

const PRODUCT_FEATURE_NODE_FIELDS = `
  id
  referenceNum
  name
  workDone { value }
  originalEstimate { value }
  score
  workflowStatus { id name position color internalMeaning }
  workflowKind { id name }
  assignedToUser { id name email }
  tags { name }
  teamLocation
  position
  createdAt
`;

// Aha's workflow meanings; WorkflowMeaningEnum in the GraphQL schema
const WORKFLOW_MEANINGS = ["NOT_STARTED", "IN_PROGRESS", "DONE", "SHIPPED", "WONT_DO", "ALREADY_EXISTS"] as const;
type WorkflowMeaning = (typeof WORKFLOW_MEANINGS)[number];

/** Aha's maximum page size for feature queries (larger requests are silently capped at 500). */
const PRODUCT_FEATURES_PER_PAGE = 500;
// Without an explicit order Aha's pages overlap: 10 pages of a 4,537-feature
// product held only 3,395 distinct features. createdAt is unique in practice;
// position breaks any tie.
const PRODUCT_FEATURES_ORDER = "[{ name: createdAt, direction: ASC }, { name: position, direction: ASC }]";

/** Safety cap on pages per meaning (100k features). */
const PRODUCT_FEATURES_MAX_PAGES = 200;

function productFeaturesFilter(meaning: WorkflowMeaning | null): string {
  return meaning
    ? `{ projectId: $projectId, workflowMeaning: ${meaning} }`
    : "{ projectId: $projectId }";
}

type ProductFeaturesGqlNode = {
  id: string;
  referenceNum: string;
  name: string;
  workDone?: { value: number } | null;
  originalEstimate?: { value: number } | null;
  score?: number | null;
  workflowStatus?: {
    id: string;
    name: string;
    position: number;
    color: string;
    internalMeaning: string | null;
  };
  workflowKind?: {
    id: string;
    name: string;
  };
  assignedToUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  tags?: Array<{ name: string }>;
  teamLocation?: string;
  position: number;
  createdAt: string;
};

type ProductFeaturesGqlResult = {
  features: {
    nodes: ProductFeaturesGqlNode[];
    isLastPage: boolean;
  };
};

async function fetchProductFeaturesPage(
  productId: string,
  meaning: WorkflowMeaning | null,
  page: number
): Promise<ProductFeaturesGqlNode[]> {
  const result = await ahaGraphQL<ProductFeaturesGqlResult>(
    `query($projectId: ID!, $page: Int!, $per: Int!) {
      features(filters: ${productFeaturesFilter(meaning)}, order: ${PRODUCT_FEATURES_ORDER}, page: $page, per: $per) {
        nodes { ${PRODUCT_FEATURE_NODE_FIELDS} }
        isLastPage
      }
    }`,
    { projectId: productId, page, per: PRODUCT_FEATURES_PER_PAGE },
    300
  );
  return result.features.nodes;
}

/** Feature counts per meaning (or for the whole product) in one cheap request. */
async function countProductFeatures(
  productId: string,
  meanings: Array<WorkflowMeaning | null>
): Promise<number[]> {
  const selections = meanings
    .map((m, i) => `c${i}: features(filters: ${productFeaturesFilter(m)}, per: 1) { totalCount }`)
    .join("\n");
  const result = await ahaGraphQL<Record<string, { totalCount: number }>>(
    `query($projectId: ID!) { ${selections} }`,
    { projectId: productId },
    300
  );
  return meanings.map((_, i) => result[`c${i}`]?.totalCount ?? 0);
}

function mapProductFeatureNode(
  node: ProductFeaturesGqlNode,
  completeMeanings: Set<string>
): AhaFeature {
  return {
    id: node.id,
    reference_num: node.referenceNum,
    name: node.name,
    work_units: node.workDone?.value ?? null,
    original_estimate: node.originalEstimate?.value ?? null,
    score: node.score ?? null,
    workflow_status: node.workflowStatus
      ? {
          id: node.workflowStatus.id,
          name: node.workflowStatus.name,
          color: node.workflowStatus.color,
          position: node.workflowStatus.position,
          complete: completeMeanings.has(node.workflowStatus.internalMeaning ?? ""),
        }
      : undefined,
    workflow_kind: node.workflowKind,
    assigned_to_user: node.assignedToUser ?? null,
    tags: node.tags?.map((t) => t.name) ?? [],
    team_location: node.teamLocation,
    position: node.position,
    created_at: node.createdAt,
  };
}

/**
 * Fetch features from a product via GraphQL v2, then filter by team_location,
 * tag, workflow kind and estimate in memory (Aha can't filter on those).
 *
 * `incompleteOnly` asks Aha to return only features whose workflow meaning is not
 * one of the configured complete meanings, which skips most of a mature product.
 *
 * Requests: one aliased count request, then every page in parallel.
 */
export async function listFeaturesInProduct(
  productId: string,
  options?: {
    teamLocation?: string;
    tag?: string;
    unestimatedOnly?: boolean;
    incompleteOnly?: boolean;
    excludeWorkflowKinds?: string[];
  }
): Promise<AhaFeature[]> {
  const completeMeanings = new Set(getConfigSync().workflow.completeMeanings);
  const meanings: Array<WorkflowMeaning | null> = options?.incompleteOnly
    ? WORKFLOW_MEANINGS.filter((m) => !completeMeanings.has(m))
    : [null];

  const counts = await countProductFeatures(productId, meanings);
  const pageRequests = meanings.flatMap((meaning, i) => {
    const pages = Math.min(
      Math.ceil(counts[i] / PRODUCT_FEATURES_PER_PAGE),
      PRODUCT_FEATURES_MAX_PAGES
    );
    return Array.from({ length: pages }, (_, p) => ({ meaning, page: p + 1 }));
  });

  const pageResults = await Promise.all(
    pageRequests.map(({ meaning, page }) => fetchProductFeaturesPage(productId, meaning, page))
  );
  const allNodes = pageResults.flat();

  const mappedFeatures = allNodes.map((node) => mapProductFeatureNode(node, completeMeanings));

  // A feature edited while pages are in flight can shift pages and appear twice
  const uniqueFeatures = Array.from(
    new Map(mappedFeatures.map((f) => [f.id, f])).values()
  );

  // Filter by team_location if specified
  let filtered = uniqueFeatures;
  if (options?.teamLocation) {
    filtered = filtered.filter((f) => f.team_location === options.teamLocation);
  }

  // Exclude certain workflow kinds if specified
  if (options?.excludeWorkflowKinds && options.excludeWorkflowKinds.length > 0) {
    filtered = filtered.filter(
      (f) => !f.workflow_kind || !options.excludeWorkflowKinds?.includes(f.workflow_kind.name)
    );
  }

  // Filter by tag if specified (case-insensitive)
  if (options?.tag) {
    filtered = filtered.filter((f) =>
      f.tags?.some((t) => t.toLowerCase() === options.tag?.toLowerCase())
    );
  }

  // Filter unestimated if requested
  if (options?.unestimatedOnly) {
    filtered = filtered.filter(isUnestimated);
  }

  return filtered;
}

/**
 * Get unique team_location values from all features in a product.
 * Uses GraphQL v2 API to efficiently fetch team_location for all features.
 */
export async function listTeamLocations(productId: string): Promise<string[]> {
  const locations = new Set<string>();
  let page = 1;
  const perPage = 200;
  let hasMore = true;

  // Paginate through all features using GraphQL
  while (hasMore) {
    const query = `
      query($projectId: ID!, $page: Int!, $per: Int!) {
        features(filters: { projectId: $projectId }, page: $page, per: $per) {
          nodes {
            teamLocation
          }
          isLastPage
        }
      }
    `;

    const variables = {
      projectId: productId,
      page,
      per: perPage,
    };

    const result = await ahaGraphQL<{
      features: {
        nodes: Array<{ teamLocation?: string }>;
        isLastPage: boolean;
      };
    }>(query, variables);

    // Collect unique team_location values
    result.features.nodes.forEach((node) => {
      if (node.teamLocation) {
        locations.add(node.teamLocation);
      }
    });

    hasMore = !result.features.isLastPage;
    page++;
  }

  return Array.from(locations).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export async function getFeature(featureId: string): Promise<AhaFeature> {
  const response = await ahaFetch<{ feature: AhaFeature }>(
    `/features/${featureId}`,
    {
      params: {
        fields:
          "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,team_location,position,created_at,updated_at,description,requirements,release,epic",
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
  const projectUsers = await ahaFetchAllPages<{ user: AhaUser }>(
    `/products/${productId}/users`,
    "project_users",
    { fields: "id,name,email,avatar_url" },
    300
  );
  // Extract the user object from each project_user wrapper
  return projectUsers.map((pu) => pu.user).filter((u) => u && u.id);
}

// --- Iteration API methods (GraphQL v2) ---

// GraphQL status codes → readable status strings
const ITERATION_STATUS_MAP: Record<number, AhaIteration["status"]> = {
  10: "planning",
  20: "started",
  30: "complete",
};

interface GqlIterationHeader {
  id: string;
  name: string;
  referenceNum: string;
  status: number;
  startDate: string | null;
  endDate: string | null;
  capacity: { value: number; units: string } | null;
  originalEstimate: { value: number | null } | null;
}

interface GqlIterationRecord {
  id: string;
  referenceNum: string;
  name: string;
  originalEstimate: { value: number; units: string } | null;
  workflowStatus: { id: string; name: string; color: number; position: number; internalMeaning: string | null } | null;
  assignedToUser: { id: string; name: string; email: string } | null;
  tags: Array<{ name: string }> | null;
  createdAt: string;
}

interface GqlIterationDetail extends GqlIterationHeader {
  // Non-feature records (e.g. requirements) come back as empty objects
  records: Array<GqlIterationRecord | Record<string, never>>;
  teamMembers: Array<{
    storyPoints: number | null;
    hasNonWorkingDays: boolean;
    user: { id: string; name: string } | null;
  }>;
}

function mapGqlIteration(gql: GqlIterationHeader): AhaIteration {
  return {
    id: gql.id,
    name: gql.name,
    reference_num: gql.referenceNum,
    status: ITERATION_STATUS_MAP[gql.status] ?? "planning",
    start_date: gql.startDate,
    end_date: gql.endDate,
    capacity: gql.capacity?.value ?? null,
    planned_points: gql.originalEstimate?.value ?? null,
  };
}

import { getConfigSync } from "./config";

function mapGqlFeature(rec: GqlIterationRecord, completeMeanings: Set<string>): AhaFeature {
  const ws = rec.workflowStatus;
  return {
    id: rec.id,
    reference_num: rec.referenceNum,
    name: rec.name,
    original_estimate: rec.originalEstimate?.value ?? null,
    workflow_status: ws
      ? {
          id: ws.id,
          name: ws.name,
          color: `#${ws.color.toString(16).padStart(6, "0")}`,
          position: ws.position,
          complete: completeMeanings.has(ws.internalMeaning ?? ""),
        }
      : undefined,
    assigned_to_user: rec.assignedToUser ?? null,
    tags: rec.tags?.map((t) => t.name) ?? undefined,
    position: 0,
    created_at: rec.createdAt,
  };
}

// The list carries no feature records: records are the expensive part (pulling
// them for every iteration takes several seconds and trips Aha's per-request
// object cap), and the sprint list only needs headers.
const ITERATION_HEADER_FIELDS = `
  id name referenceNum status startDate endDate
  capacity { value units }
  originalEstimate { value }
`;

export async function listIterations(teamProductId: string): Promise<AhaIteration[]> {
  const allIterations: AhaIteration[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const data = await ahaGraphQL<{
      iterations: { nodes: GqlIterationHeader[]; isLastPage: boolean };
    }>(
      `query($projectId: ID!, $page: Int!, $per: Int!) {
        iterations(filters: { projectId: $projectId }, page: $page, per: $per) {
          nodes { ${ITERATION_HEADER_FIELDS} }
          isLastPage
        }
      }`,
      { projectId: teamProductId, page, per: perPage },
      120
    );

    allIterations.push(...data.iterations.nodes.map(mapGqlIteration));
    if (data.iterations.isLastPage) break;
    page++;
  }

  return allIterations;
}

export interface IterationDetail {
  iteration: AhaIteration;
  features: AhaFeature[];
  teamCapacity: IterationMemberCapacity[];
}

/**
 * One iteration with its features and per-member team capacity, in a single
 * GraphQL request. Aha accepts a reference number (e.g. "DEV-SP-38") as the id.
 */
export async function getIterationDetail(referenceNum: string): Promise<IterationDetail | undefined> {
  const data = await ahaGraphQL<{ iteration: GqlIterationDetail | null }>(
    `query($id: ID!) {
      iteration(id: $id) {
        ${ITERATION_HEADER_FIELDS}
        records {
          ... on Feature {
            id referenceNum name
            originalEstimate { value units }
            workflowStatus { id name color position internalMeaning }
            assignedToUser { id name email }
            tags { name }
            createdAt
          }
        }
        teamMembers { storyPoints hasNonWorkingDays user { id name } }
      }
    }`,
    { id: referenceNum },
    120
  );

  const gql = data.iteration;
  if (!gql) return undefined;

  const completeMeanings = new Set(getConfigSync().workflow.completeMeanings);
  const features = gql.records
    .filter((rec): rec is GqlIterationRecord => "id" in rec)
    .map((rec) => mapGqlFeature(rec, completeMeanings));

  const teamCapacity = gql.teamMembers.flatMap((m) =>
    m.user && m.storyPoints != null
      ? [{
          userId: m.user.id,
          name: m.user.name,
          storyPoints: m.storyPoints,
          hasNonWorkingDays: m.hasNonWorkingDays,
        }]
      : []
  );

  return {
    iteration: { ...mapGqlIteration(gql), feature_count: features.length },
    features,
    teamCapacity,
  };
}

export async function getIteration(referenceNum: string): Promise<AhaIteration | undefined> {
  return (await getIterationDetail(referenceNum))?.iteration;
}

export async function listFeaturesInIteration(
  referenceNum: string,
  options?: { unestimatedOnly?: boolean }
): Promise<AhaFeature[]> {
  const features = (await getIterationDetail(referenceNum))?.features ?? [];
  return options?.unestimatedOnly ? features.filter(isUnestimated) : features;
}

export async function updateFeatureWorkUnits(
  featureId: string,
  workUnits: number
): Promise<AhaFeature> {
  const response = await ahaFetch<{ feature: AhaFeature }>(
    `/features/${featureId}`,
    {
      method: "PUT",
      body: { feature: { work_units: workUnits } },
    }
  );
  invalidateCache(`/features/${featureId}`);
  invalidateCache("/products/");
  return response.feature;
}

export async function updateFeatureEstimate(
  featureId: string,
  estimate: number
): Promise<AhaFeature> {
  const response = await ahaFetch<{ feature: AhaFeature }>(
    `/features/${featureId}`,
    {
      method: "PUT",
      body: { feature: { original_estimate: estimate } },
    }
  );
  invalidateCache(`/features/${featureId}`);
  invalidateCache("/products/");
  return response.feature;
}


// --- Planning poker (Aha Develop extension) ---
// The aha-develop.planning-poker extension stores one extension field per voter,
// named "estimate:<userId>", on the feature. These fields are not exposed by REST v1.
const PLANNING_POKER_EXTENSION = "aha-develop.planning-poker";

/** Max features per batched votes request; keeps one request well under Aha's object cap. */
export const PLANNING_POKER_BATCH_SIZE = 50;

interface GqlExtensionField {
  name: string;
  updatedAt: string;
  value: { id?: string; name?: string; estimate?: number | null; unknown?: boolean } | null;
  extension: { identifier: string } | null;
}

/**
 * Planning-poker votes for many features in one GraphQL request (one aliased
 * `feature` lookup per id). Returns votes keyed by feature id.
 */
export async function listPlanningPokerVotes(
  featureIds: string[]
): Promise<Record<string, PlanningPokerVote[]>> {
  if (featureIds.length === 0) return {};
  if (featureIds.length > PLANNING_POKER_BATCH_SIZE) {
    throw new Error(`At most ${PLANNING_POKER_BATCH_SIZE} features per request`);
  }

  const varDefs = featureIds.map((_, i) => `$id${i}: ID!`).join(", ");
  const selections = featureIds
    .map(
      (_, i) =>
        `f${i}: feature(id: $id${i}) { extensionFields { name updatedAt value extension { identifier } } }`
    )
    .join("\n");
  const variables = Object.fromEntries(featureIds.map((id, i) => [`id${i}`, id]));

  const data = await ahaGraphQL<Record<string, { extensionFields: GqlExtensionField[] } | null>>(
    `query(${varDefs}) { ${selections} }`,
    variables,
    30
  );

  return Object.fromEntries(
    featureIds.map((id, i) => [id, toPokerVotes(data[`f${i}`]?.extensionFields ?? [])])
  );
}

function toPokerVotes(fields: GqlExtensionField[]): PlanningPokerVote[] {
  return fields
    .filter(
      (f) =>
        f.extension?.identifier === PLANNING_POKER_EXTENSION &&
        f.name.startsWith("estimate:") &&
        f.value
    )
    .map((f) => ({
      userId: f.value?.id ?? f.name.slice("estimate:".length),
      name: f.value?.name ?? "Unknown",
      estimate: f.value?.unknown ? null : (f.value?.estimate ?? null),
      updatedAt: f.updatedAt,
    }));
}

export async function listEpicsForProduct(productId: string): Promise<AhaEpic[]> {
  return ahaFetchAllPages<AhaEpic>(
    `/products/${productId}/epics`,
    "epics",
    { fields: "id,reference_num,name,start_date,due_date,workflow_status,progress" },
    300
  );
}
