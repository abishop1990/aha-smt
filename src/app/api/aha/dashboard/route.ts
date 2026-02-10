import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  listProducts,
  listReleasesInProduct,
  listFeaturesPage,
} from "@/lib/aha-client";

/**
 * Composite dashboard endpoint.
 * Fetches user, products, releases, and first page of features
 * in parallel on the server side — one client round-trip instead of 4.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const productId = searchParams.get("productId") || undefined;

    // Phase 1: user + products in parallel
    const [user, products] = await Promise.all([
      getCurrentUser().catch(() => null),
      listProducts().catch(() => []),
    ]);

    // Skip company-level product lines when auto-selecting
    const defaultProduct = products.find((p) => !p.product_line) ?? products[0];
    const pid = productId || defaultProduct?.id;
    if (!pid) {
      return NextResponse.json({
        user,
        products,
        releases: [],
        features: [],
        featuresPagination: null,
      });
    }

    // Phase 2: releases (depends on product ID)
    const releases = await listReleasesInProduct(pid).catch(() => []);

    // Pick the first non-parking-lot release
    const activeRelease = releases.find((r) => !r.parking_lot) || releases[0];

    // Phase 3: features for the active release (first page only for speed)
    let features: Awaited<ReturnType<typeof listFeaturesPage>> | null = null;
    if (activeRelease) {
      features = await listFeaturesPage(activeRelease.id, 1, 200).catch(() => null);
    }

    return NextResponse.json({
      user,
      products,
      releases,
      activeReleaseId: activeRelease?.id ?? null,
      features: features?.features ?? [],
      featuresPagination: features?.pagination ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard data fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
