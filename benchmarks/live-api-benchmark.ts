/**
 * Live API Benchmark — measures actual Aha REST API latency
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
const BASE_URL = `https://${AHA_DOMAIN}.aha.io/api/v1`;

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

async function ahaGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${AHA_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const msg = text.replace(/<[^>]*>/g, "").trim().slice(0, 100);
    throw new Error(`Aha API ${res.status}: ${msg}`);
  }

  return res.json() as Promise<T>;
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
// Benchmark flows
// ---------------------------------------------------------------------------

let productId: string;
let releaseIds: string[] = [];
let featureIds: string[] = [];

async function discoverProduct(): Promise<void> {
  console.log("\n--- Discovering products ---");

  const data = await ahaGet<{ products: Array<{ id: string; reference_prefix: string; name: string }> }>(
    "/products"
  );

  console.log(`Found ${data.products.length} product(s):`);
  for (const p of data.products) {
    console.log(`  ${p.reference_prefix} — ${p.name} (${p.id})`);
  }

  // If user set a default, use it
  const defaultId = process.env.AHA_DEFAULT_PRODUCT_ID;
  if (defaultId) {
    const product = data.products.find((p) => p.id === defaultId);
    if (product) {
      productId = product.id;
      console.log(`Using configured product: ${product.name} (${product.id})\n`);
      return;
    }
  }

  // Otherwise, probe each product for one that has releases
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
      console.log(`  ${p.reference_prefix} — no releases, skipping`);
    } catch {
      console.log(`  ${p.reference_prefix} — error querying releases, skipping`);
    }
  }

  // Fallback to first
  productId = data.products[0].id;
  console.log(`Fallback to first product: ${data.products[0].name}\n`);
}

async function benchAuthentication(): Promise<void> {
  await measure("GET /me (auth check)", async () => {
    await ahaGet("/me");
  }, 5);
}

async function benchListProducts(): Promise<void> {
  await measure("GET /products", async () => {
    const data = await ahaGet<{ products: unknown[] }>("/products");
    return data.products.length;
  });
}

async function benchListReleases(): Promise<void> {
  await measure("GET /products/:id/releases", async () => {
    const data = await ahaGet<{
      releases: Array<{ id: string; reference_num: string; name: string; parking_lot: boolean }>;
    }>(
      `/products/${productId}/releases`,
      { fields: "id,reference_num,name,start_date,release_date,progress,parking_lot" }
    );

    // Save release IDs for subsequent benchmarks (all of them, some may have features)
    releaseIds = data.releases.map((r) => r.id);

    return data.releases.length;
  });
}

async function benchListFeaturesInRelease(): Promise<void> {
  if (releaseIds.length === 0) {
    console.log("  SKIP: No releases found to list features from\n");
    return;
  }

  // Find a release that actually has features
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

  await measure(`GET /releases/:id/features (release ${relId})`, async () => {
    const data = await ahaGet<{ features: Array<{ id: string }> }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at",
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

  const featId = featureIds[0];

  await measure(`GET /features/:id (feature ${featId})`, async () => {
    await ahaGet(
      `/features/${featId}`,
      {
        fields:
          "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at,updated_at,description,requirements,release",
      }
    );
  });
}

async function benchListTeams(): Promise<void> {
  try {
    await measure("GET /project_teams", async () => {
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
    await measure(`GET /products/:id/users`, async () => {
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

async function benchPaginatedFeatures(): Promise<void> {
  const relId = releaseWithFeatures;
  if (!relId) {
    console.log("  SKIP: No release with features to paginate\n");
    return;
  }

  await measure(`Paginated fetch all features (release ${relId})`, async () => {
    let page = 1;
    let totalItems = 0;
    let totalPages = 1;

    while (page <= totalPages) {
      const data = await ahaGet<{
        features: unknown[];
        pagination: { total_pages: number; current_page: number };
      }>(`/releases/${relId}/features`, {
        fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at",
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

let releaseWithFeatures: string | null = null;

async function benchFeatureFieldComparison(): Promise<void> {
  if (!releaseWithFeatures) {
    console.log("  SKIP: No release with features to compare\n");
    return;
  }

  const relId = releaseWithFeatures;

  // Full fields (current approach)
  await measure(`Features FULL fields (release ${relId})`, async () => {
    const data = await ahaGet<{ features: unknown[] }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at,description",
        per_page: "200",
      }
    );
    return data.features.length;
  });

  // Lean fields (just what backlog table needs)
  await measure(`Features LEAN fields (release ${relId})`, async () => {
    const data = await ahaGet<{ features: unknown[] }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position",
        per_page: "200",
      }
    );
    return data.features.length;
  });

  // Minimal fields (just IDs and scores for estimation queue)
  await measure(`Features MINIMAL fields (release ${relId})`, async () => {
    const data = await ahaGet<{ features: unknown[] }>(
      `/releases/${relId}/features`,
      {
        fields: "id,reference_num,name,score",
        per_page: "200",
      }
    );
    return data.features.length;
  });
}

// ---------- End-to-end flows ----------

async function benchSprintPlanningFlow(): Promise<void> {
  const relId = releaseWithFeatures;
  if (!relId) {
    console.log("  SKIP Sprint planning flow: no release with features\n");
    return;
  }

  await measure("E2E: Sprint planning flow (releases → features → detail)", async () => {
    // Step 1: List releases
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });

    // Step 2: Get features for the release with data
    const features = await ahaGet<{
      features: Array<{ id: string }>;
    }>(`/releases/${relId}/features`, {
      fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at",
      per_page: "200",
    });

    // Step 3: Get detail for first feature
    if (features.features.length > 0) {
      await ahaGet(`/features/${features.features[0].id}`, {
        fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,description,requirements,release",
      });
    }

    return features.features.length;
  }, 2);
}

async function benchEstimationFlow(): Promise<void> {
  const relId = releaseWithFeatures;
  if (!relId) {
    console.log("  SKIP Estimation flow: no release with features\n");
    return;
  }

  await measure("E2E: Estimation flow (releases → unestimated features)", async () => {
    // Step 1: List releases
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });

    // Step 2: Get all features and filter unestimated client-side
    const features = await ahaGet<{
      features: Array<{ id: string; score?: number | null }>;
    }>(`/releases/${relId}/features`, {
      fields: "id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at,description",
      per_page: "200",
    });

    const unestimated = features.features.filter(
      (f) => f.score === null || f.score === undefined || f.score === 0
    );

    return unestimated.length;
  }, 2);
}

async function benchDashboardFlow(): Promise<void> {
  // Sequential approach (old: 3 client → server → Aha round-trips)
  await measure("E2E: Dashboard SEQUENTIAL (me → products → releases)", async () => {
    await ahaGet("/me");
    await ahaGet<{ products: Array<{ id: string }> }>("/products");
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });
    return 3;
  }, 2);

  // Parallel approach (new: 1 client → server round-trip, server fans out in parallel)
  await measure("E2E: Dashboard PARALLEL (me + products || releases)", async () => {
    const [, products] = await Promise.all([
      ahaGet("/me"),
      ahaGet<{ products: Array<{ id: string }> }>("/products"),
    ]);
    await ahaGet(`/products/${productId}/releases`, {
      fields: "id,reference_num,name,start_date,release_date,progress,parking_lot",
    });
    return 3;
  }, 2);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("==========================================================");
  console.log("  Aha SMT — Live API Benchmark");
  console.log(`  Domain: ${AHA_DOMAIN}.aha.io`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log("==========================================================");

  try {
    await discoverProduct();
  } catch (err) {
    console.error("Failed to discover products. Check credentials.", err);
    process.exit(1);
  }

  console.log("--- Individual endpoint latency (3 iterations each) ---\n");

  await benchAuthentication();
  await benchListProducts();
  await benchListReleases();
  await benchListFeaturesInRelease();
  await benchGetFeatureDetail();
  await benchListTeams();
  await benchListUsers();

  console.log("\n--- Pagination benchmark (2 iterations) ---\n");

  await benchPaginatedFeatures();

  console.log("\n--- Field selection comparison (3 iterations) ---\n");

  await benchFeatureFieldComparison();

  console.log("\n--- End-to-end flow latency (2 iterations) ---\n");

  try { await benchDashboardFlow(); } catch (err: any) { console.log(`  SKIP Dashboard flow: ${err.message}\n`); }
  try { await benchSprintPlanningFlow(); } catch (err: any) { console.log(`  SKIP Sprint planning flow: ${err.message}\n`); }
  try { await benchEstimationFlow(); } catch (err: any) { console.log(`  SKIP Estimation flow: ${err.message}\n`); }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log("  RESULTS");
  console.log("==========================================================\n");

  const nameWidth = 60;

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

  // Latency warnings
  console.log("\n--- Latency analysis ---\n");

  const THRESHOLDS = {
    single: 500, // single endpoint > 500ms
    e2e: 2000, // end-to-end flow > 2s
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
