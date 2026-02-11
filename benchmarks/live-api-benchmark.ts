/**
 * Live API Benchmark — measures actual Aha REST + GraphQL API latency
 *
 * Usage:  npx tsx benchmarks/live-api-benchmark.ts
 *
 * Reads AHA_DOMAIN and AHA_API_TOKEN from .env.local
 * Reports p50/p95/avg timings for every key flow.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const envPath = resolve(__dirname, "../.env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  process.env[key] = val;
}

const AHA_DOMAIN = process.env.AHA_DOMAIN!;
const AHA_API_TOKEN = process.env.AHA_API_TOKEN!;
const AHA_TEAM_PRODUCT_ID = process.env.AHA_TEAM_PRODUCT_ID;
const REST_BASE = `https://${AHA_DOMAIN}.aha.io/api/v1`;
const GRAPHQL_URL = `https://${AHA_DOMAIN}.aha.io/api/v2/graphql`;

if (!AHA_DOMAIN || !AHA_API_TOKEN) {
  console.error("Missing AHA_DOMAIN or AHA_API_TOKEN in .env.local");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface TimingResult {
  name: string;
  durations: number[];
  avg: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
  itemCount?: number;
}

const results: TimingResult[] = [];

const headers: HeadersInit = {
  Authorization: `Bearer ${AHA_API_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function ahaGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${REST_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { method: "GET", headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const msg = text.replace(/<[^>]*>/g, "").trim().slice(0, 100);
    throw new Error(`Aha API ${res.status}: ${msg}`);
  }

  return res.json() as Promise<T>;
}

async function ahaGraphQL<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GraphQL ${res.status}: ${text.slice(0, 100)}`);
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors[0].message}`);
  return json.data!;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function measure(
  name: string,
  fn: () => Promise<number | void>,
  iterations = 3
): Promise<void> {
  const durations: number[] = [];
  let itemCount: number | undefined;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const count = await fn();
    const elapsed = performance.now() - start;
    durations.push(elapsed);
    if (typeof count === "number") itemCount = count;
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  results.push({
    name,
    durations,
    avg,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    itemCount,
  });
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let productId: string;
let releaseIds: string[] = [];
let featureIds: string[] = [];
let releaseWithFeatures: string | null = null;

// ---------------------------------------------------------------------------
// REST API benchmarks
// ---------------------------------------------------------------------------

async function discoverProduct(): Promise<void> {
  console.log("\n--- Discovering products ---");

  const data = await ahaGet<{ products: Array<{ id: string; reference_prefix: string; name: string }> }>(
    "/products"
  );

  console.log(`Found ${data.products.length} product(s):`);
  for (const p of data.products) {
    console.log(`  ${p.reference_prefix} — ${p.name} (${p.id})`);
  }

  const defaultId = process.env.AHA_DEFAULT_PRODUCT_ID;
  if (defaultId) {
    const product = data.products.find((p) => p.id === defaultId);
    if (product) {
      productId = product.id;
      console.log(`Using configured product: ${product.name} (${product.id})\n`);
      return;
    }
  }

  for (const p of data.products) {
    try {
      const rel = await ahaGet<{ releases: unknown[] }>(
        `/products/${p.id}/releases`,
        { fields: "id", per_page: "1" }
      );
      if (rel.releases.length > 0) {
        productId = p.id;
        console.log(`Using product with releases: ${p.name} (${p.id})\n`);
        return;
      }
    } catch {
      // skip
    }
  }

  productId = data.products[0].id;
  console.log(`Fallback to first product: ${data.products[0].name}\n`);
}

async function benchAuthentication(): Promise<void> {
  await measure("REST: GET /me (auth check)", async () => {
    await ahaGet("/me");
  }, 5);
}

async function benchListProducts(): Promise<void> {
  await measure("REST: GET /products", async () => {
    const data = await ahaGet<{ products: unknown[] }>("/products");
    return data.products.length;
  });
}

async function benchListReleases(): Promise<void> {
  await measure("REST: GET /products/:id/releases", async () => {
    const data = await ahaGet<{
      releases: Array<{ id: string; reference_num: string; name: string; parking_lot: boolean }>;
    }>(
      `/products/${productId}/releases`,
      { fields: "id,reference_num,name,start_date,release_date,progress,parking_lot" }
    );
    releaseIds = data.releases.map((r) => r.id);
    return data.releases.length;
  });
}

async function benchListFeaturesInRelease(): Promise<void> {
  if (releaseIds.length === 0) {
    console.log("  SKIP: No releases found to list features from\n");
    return;
  }

  let relIdWithFeatures: string | null = null;
  for (const rid of releaseIds) {
    try {
      const probe = await ahaGet<{ features: Array<{ id: string }> }>(
        `/releases/${rid}/features`,
        { fields: "id", per_page: "1" }
      );
      if (probe.features.length > 0) {
        relIdWithFeatures = rid;
        break;
      }
    } catch {
      // skip
    }
  }

  if (!relIdWithFeatures) {
    console.log("  SKIP: No releases with features found\n");
    return;
  }

  const relId = relIdWithFeatures;

  await measure(`REST: GET /releases/:id/features (200 items)`, async () => {
    const data = await ahaGet<{ features: Array<{ id: string }> }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,position,created_at",
        per_page: "200",
      }
    );

    featureIds = data.features.map((f) => f.id).slice(0, 5);
    if (data.features.length > 0) releaseWithFeatures = relId;
    return data.features.length;
  });
}

async function benchGetFeatureDetail(): Promise<void> {
  if (featureIds.length === 0) {
    console.log("  SKIP: No features found to get detail for\n");
    return;
  }

  await measure(`REST: GET /features/:id (single feature detail)`, async () => {
    await ahaGet(
      `/features/${featureIds[0]}`,
      {
        fields:
          "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,position,created_at,updated_at,description,requirements,release",
      }
    );
  });
}

async function benchListTeams(): Promise<void> {
  try {
    await measure("REST: GET /project_teams", async () => {
      const data = await ahaGet<{ project_teams: unknown[] }>("/project_teams", {
        fields: "id,name,team_members",
      });
      return data.project_teams.length;
    });
  } catch (err: any) {
    console.log(`  SKIP /project_teams: ${err.message}\n`);
  }
}

async function benchListUsers(): Promise<void> {
  try {
    await measure("REST: GET /products/:id/users", async () => {
      const data = await ahaGet<{ project_users: unknown[] }>(
        `/products/${productId}/users`,
        { fields: "id,name,email" }
      );
      return data.project_users.length;
    });
  } catch (err: any) {
    console.log(`  SKIP /products/:id/users: ${err.message}\n`);
  }
}

async function benchListIterationsREST(): Promise<void> {
  const teamId = AHA_TEAM_PRODUCT_ID;
  if (!teamId) {
    console.log("  SKIP REST iterations: AHA_TEAM_PRODUCT_ID not set\n");
    return;
  }

  await measure("REST: GET /products/:id/iterations (list only)", async () => {
    const data = await ahaGet<{ iterations: unknown[] }>(
      `/products/${teamId}/iterations`,
      { fields: "id,name,reference_num,status,start_date,end_date" }
    );
    return data.iterations.length;
  });
}

async function benchPaginatedFeatures(): Promise<void> {
  const relId = releaseWithFeatures;
  if (!relId) {
    console.log("  SKIP: No release with features to paginate\n");
    return;
  }

  await measure(`REST: Paginated fetch all features`, async () => {
    let page = 1;
    let totalItems = 0;
    let totalPages = 1;

    while (page <= totalPages) {
      const data = await ahaGet<{
        features: unknown[];
        pagination: { total_pages: number; current_page: number };
      }>(`/releases/${relId}/features`, {
        fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,position,created_at",
        per_page: "200",
        page: String(page),
      });

      totalItems += data.features.length;
      totalPages = data.pagination.total_pages;
      page++;
    }

    return totalItems;
  }, 2);
}

// ---------- Field-reduction comparison ----------

async function benchFeatureFieldComparison(): Promise<void> {
  if (!releaseWithFeatures) {
    console.log("  SKIP: No release with features to compare\n");
    return;
  }

  const relId = releaseWithFeatures;

  await measure(`REST: Features FULL fields (incl. description)`, async () => {
    const data = await ahaGet<{ features: unknown[] }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,position,created_at,description",
        per_page: "200",
      }
    );
    return data.features.length;
  });

  await measure(`REST: Features LEAN fields (no description)`, async () => {
    const data = await ahaGet<{ features: unknown[] }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,position",
        per_page: "200",
      }
    );
    return data.features.length;
  });

  await measure(`REST: Features MINIMAL fields (id, name, score)`, async () => {
    const data = await ahaGet<{ features: unknown[] }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,original_estimate",
        per_page: "200",
      }
    );
    return data.features.length;
  });
}

// ---------------------------------------------------------------------------
// GraphQL API benchmarks
// ---------------------------------------------------------------------------

const GQL_ITERATION_FIELDS = `
  id name referenceNum status startDate endDate
  capacity { value units }
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
`;

async function benchGraphQLIterationsList(): Promise<void> {
  const teamId = AHA_TEAM_PRODUCT_ID;
  if (!teamId) {
    console.log("  SKIP GraphQL iterations: AHA_TEAM_PRODUCT_ID not set\n");
    return;
  }

  await measure("GraphQL: List all iterations (with features)", async () => {
    let page = 1;
    let totalIterations = 0;
    let totalFeatures = 0;

    while (true) {
      const data = await ahaGraphQL<{
        iterations: {
          nodes: Array<{ referenceNum: string; records: unknown[] }>;
          isLastPage: boolean;
        };
      }>(
        `query($projectId: ID!, $page: Int!, $per: Int!) {
          iterations(filters: { projectId: $projectId }, page: $page, per: $per) {
            nodes { ${GQL_ITERATION_FIELDS} }
            isLastPage
          }
        }`,
        { projectId: teamId, page, per: 50 }
      );

      for (const node of data.iterations.nodes) {
        totalIterations++;
        totalFeatures += node.records.length;
      }

      if (data.iterations.isLastPage) break;
      page++;
    }

    return totalIterations;
  }, 2);
}

async function benchGraphQLSingleIteration(): Promise<void> {
  const teamId = AHA_TEAM_PRODUCT_ID;
  if (!teamId) {
    console.log("  SKIP GraphQL single iteration: AHA_TEAM_PRODUCT_ID not set\n");
    return;
  }

  // First, find a started iteration
  const listData = await ahaGraphQL<{
    iterations: { nodes: Array<{ referenceNum: string; name: string; records: unknown[] }> };
  }>(
    `query($projectId: ID!) {
      iterations(filters: { projectId: $projectId }, per: 3) {
        nodes { referenceNum name records { ... on Feature { id } } }
      }
    }`,
    { projectId: teamId }
  );

  const iter = listData.iterations.nodes.find((n) => n.records.length > 0) ?? listData.iterations.nodes[0];
  if (!iter) {
    console.log("  SKIP: No iterations found for single iteration bench\n");
    return;
  }

  await measure(`GraphQL: Single iteration + features (${iter.referenceNum})`, async () => {
    const data = await ahaGraphQL<{
      iterations: { nodes: Array<{ records: unknown[] }> };
    }>(
      `query($projectId: ID!, $per: Int!) {
        iterations(filters: { projectId: $projectId }, per: $per) {
          nodes { ${GQL_ITERATION_FIELDS} }
          isLastPage
        }
      }`,
      { projectId: teamId, per: 50 }
    );

    const found = data.iterations.nodes[0];
    return found?.records.length ?? 0;
  });
}

async function benchGraphQLSchemaIntrospection(): Promise<void> {
  await measure("GraphQL: Schema introspection (__schema)", async () => {
    await ahaGraphQL(
      `{ __schema { queryType { fields { name } } } }`
    );
  }, 3);
}

// ---------------------------------------------------------------------------
// REST vs GraphQL comparison
// ---------------------------------------------------------------------------

async function benchRESTvsGraphQLComparison(): Promise<void> {
  const teamId = AHA_TEAM_PRODUCT_ID;
  if (!teamId) {
    console.log("  SKIP REST vs GraphQL comparison: AHA_TEAM_PRODUCT_ID not set\n");
    return;
  }

  // REST approach: list iterations (no features — REST can't link them)
  await measure("Comparison REST: List iterations only (no features)", async () => {
    const data = await ahaGet<{ iterations: unknown[] }>(
      `/products/${teamId}/iterations`,
      { fields: "id,name,reference_num,status,start_date,end_date" }
    );
    return data.iterations.length;
  });

  // GraphQL approach: list iterations WITH features in one request
  await measure("Comparison GraphQL: List iterations + features", async () => {
    let total = 0;
    let page = 1;

    while (true) {
      const data = await ahaGraphQL<{
        iterations: {
          nodes: Array<{ records: unknown[] }>;
          isLastPage: boolean;
        };
      }>(
        `query($projectId: ID!, $page: Int!, $per: Int!) {
          iterations(filters: { projectId: $projectId }, page: $page, per: $per) {
            nodes { ${GQL_ITERATION_FIELDS} }
            isLastPage
          }
        }`,
        { projectId: teamId, page, per: 50 }
      );

      for (const n of data.iterations.nodes) total += n.records.length;
      if (data.iterations.isLastPage) break;
      page++;
    }

    return total;
  });
}

// ---------------------------------------------------------------------------
// End-to-end flows
// ---------------------------------------------------------------------------

async function benchDashboardFlow(): Promise<void> {
  await measure("E2E: Dashboard SEQUENTIAL (me → products → releases)", async () => {
    await ahaGet("/me");
    await ahaGet<{ products: Array<{ id: string }> }>("/products");
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });
    return 3;
  }, 2);

  await measure("E2E: Dashboard PARALLEL (me + products || releases)", async () => {
    await Promise.all([
      ahaGet("/me"),
      ahaGet<{ products: Array<{ id: string }> }>("/products"),
    ]);
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });
    return 3;
  }, 2);
}

async function benchSprintPlanningFlowREST(): Promise<void> {
  const relId = releaseWithFeatures;
  if (!relId) {
    console.log("  SKIP Sprint planning flow (REST): no release with features\n");
    return;
  }

  await measure("E2E REST: Sprint planning (releases → features → detail)", async () => {
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });

    const features = await ahaGet<{
      features: Array<{ id: string }>;
    }>(`/releases/${relId}/features`, {
      fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,position,created_at",
      per_page: "200",
    });

    if (features.features.length > 0) {
      await ahaGet(`/features/${features.features[0].id}`, {
        fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,description,requirements,release",
      });
    }

    return features.features.length;
  }, 2);
}

async function benchSprintPlanningFlowGraphQL(): Promise<void> {
  const teamId = AHA_TEAM_PRODUCT_ID;
  if (!teamId) {
    console.log("  SKIP Sprint planning flow (GraphQL): AHA_TEAM_PRODUCT_ID not set\n");
    return;
  }

  await measure("E2E GraphQL: Sprint planning (single query → iteration + features)", async () => {
    const data = await ahaGraphQL<{
      iterations: { nodes: Array<{ records: unknown[] }> };
    }>(
      `query($projectId: ID!) {
        iterations(filters: { projectId: $projectId }, per: 1) {
          nodes { ${GQL_ITERATION_FIELDS} }
        }
      }`,
      { projectId: teamId }
    );

    return data.iterations.nodes[0]?.records.length ?? 0;
  }, 2);
}

async function benchEstimationFlow(): Promise<void> {
  const relId = releaseWithFeatures;
  if (!relId) {
    console.log("  SKIP Estimation flow: no release with features\n");
    return;
  }

  await measure("E2E: Estimation flow (releases → unestimated features)", async () => {
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });

    const features = await ahaGet<{
      features: Array<{ id: string; original_estimate?: number | null; score?: number | null }>;
    }>(`/releases/${relId}/features`, {
      fields: "id,reference_num,name,score,work_units,original_estimate,workflow_status,assigned_to_user,tags,position,created_at",
      per_page: "200",
    });

    const unestimated = features.features.filter(
      (f) => (f.original_estimate ?? f.score ?? 0) === 0
    );

    return unestimated.length;
  }, 2);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("==========================================================");
  console.log("  Aha SMT — Live API Benchmark (REST + GraphQL)");
  console.log(`  Domain: ${AHA_DOMAIN}.aha.io`);
  console.log(`  Team product: ${AHA_TEAM_PRODUCT_ID ?? "(not set)"}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log("==========================================================");

  try {
    await discoverProduct();
  } catch (err) {
    console.error("Failed to discover products. Check credentials.", err);
    process.exit(1);
  }

  // ---- REST API ----
  console.log("--- REST API: Individual endpoint latency (3 iterations each) ---\n");

  await benchAuthentication();
  await benchListProducts();
  await benchListReleases();
  await benchListFeaturesInRelease();
  await benchGetFeatureDetail();
  await benchListTeams();
  await benchListUsers();
  await benchListIterationsREST();

  console.log("\n--- REST API: Pagination benchmark (2 iterations) ---\n");

  await benchPaginatedFeatures();

  console.log("\n--- REST API: Field selection comparison (3 iterations) ---\n");

  await benchFeatureFieldComparison();

  // ---- GraphQL API ----
  console.log("\n--- GraphQL API: Endpoint latency ---\n");

  await benchGraphQLSchemaIntrospection();
  await benchGraphQLSingleIteration();
  await benchGraphQLIterationsList();

  // ---- REST vs GraphQL ----
  console.log("\n--- REST vs GraphQL: Direct comparison ---\n");

  await benchRESTvsGraphQLComparison();

  // ---- End-to-end flows ----
  console.log("\n--- End-to-end flow latency (2 iterations) ---\n");

  try { await benchDashboardFlow(); } catch (err: any) { console.log(`  SKIP Dashboard flow: ${err.message}\n`); }
  try { await benchSprintPlanningFlowREST(); } catch (err: any) { console.log(`  SKIP Sprint planning (REST): ${err.message}\n`); }
  try { await benchSprintPlanningFlowGraphQL(); } catch (err: any) { console.log(`  SKIP Sprint planning (GraphQL): ${err.message}\n`); }
  try { await benchEstimationFlow(); } catch (err: any) { console.log(`  SKIP Estimation flow: ${err.message}\n`); }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log("  RESULTS");
  console.log("==========================================================\n");

  const nameWidth = 65;

  console.log(
    "Endpoint".padEnd(nameWidth) +
      "Avg".padStart(9) +
      "P50".padStart(9) +
      "P95".padStart(9) +
      "Min".padStart(9) +
      "Max".padStart(9) +
      "Items".padStart(7)
  );
  console.log("-".repeat(nameWidth + 52));

  for (const r of results) {
    const items = r.itemCount !== undefined ? String(r.itemCount) : "-";
    console.log(
      r.name.slice(0, nameWidth).padEnd(nameWidth) +
        formatMs(r.avg).padStart(9) +
        formatMs(r.p50).padStart(9) +
        formatMs(r.p95).padStart(9) +
        formatMs(r.min).padStart(9) +
        formatMs(r.max).padStart(9) +
        items.padStart(7)
    );
  }

  // REST vs GraphQL summary
  const restIter = results.find((r) => r.name.includes("Comparison REST"));
  const gqlIter = results.find((r) => r.name.includes("Comparison GraphQL"));

  if (restIter && gqlIter) {
    console.log("\n--- REST vs GraphQL summary ---\n");
    console.log(`  REST iterations list (no features):     ${formatMs(restIter.avg)} avg, ${restIter.itemCount ?? "-"} iterations`);
    console.log(`  GraphQL iterations + features:          ${formatMs(gqlIter.avg)} avg, ${gqlIter.itemCount ?? "-"} total features`);

    if (gqlIter.itemCount && gqlIter.itemCount > 0) {
      console.log(`\n  GraphQL returns iterations + ALL linked features in ${formatMs(gqlIter.avg)}.`);
      console.log(`  REST cannot link features to iterations at all (no filter support).`);
      console.log(`  Equivalent REST approach would require N+1 calls (impossible — filter is ignored).`);
    }
  }

  // Sprint planning comparison
  const restSprint = results.find((r) => r.name.includes("E2E REST: Sprint planning"));
  const gqlSprint = results.find((r) => r.name.includes("E2E GraphQL: Sprint planning"));

  if (restSprint && gqlSprint) {
    const speedup = ((restSprint.avg - gqlSprint.avg) / restSprint.avg * 100).toFixed(0);
    console.log(`\n--- Sprint planning flow comparison ---\n`);
    console.log(`  REST (3 sequential calls):   ${formatMs(restSprint.avg)} avg`);
    console.log(`  GraphQL (1 call):            ${formatMs(gqlSprint.avg)} avg`);
    console.log(`  Speedup:                     ${speedup}% faster with GraphQL`);
  }

  // Latency warnings
  console.log("\n--- Latency analysis ---\n");

  const THRESHOLDS = {
    single: 500,
    e2e: 2000,
  };

  let hasWarnings = false;
  for (const r of results) {
    const isE2E = r.name.startsWith("E2E:");
    const threshold = isE2E ? THRESHOLDS.e2e : THRESHOLDS.single;
    if (r.p95 > threshold) {
      hasWarnings = true;
      console.log(
        `  WARNING: "${r.name}" p95 = ${formatMs(r.p95)} exceeds ${formatMs(threshold)} threshold`
      );
    }
  }

  if (!hasWarnings) {
    console.log("  All endpoints within acceptable latency thresholds.");
    console.log(`    Single endpoint: < ${formatMs(THRESHOLDS.single)}`);
    console.log(`    E2E flows:       < ${formatMs(THRESHOLDS.e2e)}`);
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
