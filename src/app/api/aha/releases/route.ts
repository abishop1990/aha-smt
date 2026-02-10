import { NextRequest, NextResponse } from "next/server";
import { listReleasesInProduct, listProducts } from "@/lib/aha-client";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let productId = searchParams.get("productId");

    if (!productId) {
      const env = getEnv();
      productId = env.AHA_DEFAULT_PRODUCT_ID ?? null;
    }

    if (!productId) {
      // If no product ID, try to get the first non-product-line product
      const products = await listProducts();
      if (products.length === 0) {
        return NextResponse.json({ error: "No products found" }, { status: 404 });
      }
      // Skip company-level product lines (they have no releases)
      const workspace = products.find((p) => !p.product_line) ?? products[0];
      productId = workspace.id;
    }

    const releases = await listReleasesInProduct(productId);
    // Sort: non-parking-lot first (by start date desc), then parking lot at the end
    const sorted = releases.sort((a, b) => {
      if (a.parking_lot !== b.parking_lot) return a.parking_lot ? 1 : -1;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return b.start_date.localeCompare(a.start_date);
    });

    return NextResponse.json({ releases: sorted, productId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch releases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
