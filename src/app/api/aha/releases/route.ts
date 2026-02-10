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
      // If no product ID, try to get the first product
      const products = await listProducts();
      if (products.length === 0) {
        return NextResponse.json({ error: "No products found" }, { status: 404 });
      }
      productId = products[0].id;
    }

    const releases = await listReleasesInProduct(productId);
    // Filter out parking lot releases and sort by start date
    const activeReleases = releases
      .filter((r) => !r.parking_lot)
      .sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return b.start_date.localeCompare(a.start_date);
      });

    return NextResponse.json({ releases: activeReleases, productId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch releases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
