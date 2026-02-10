import { NextRequest, NextResponse } from "next/server";
import { listUsersInProduct, listProducts } from "@/lib/aha-client";
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
      const products = await listProducts();
      if (products.length === 0) {
        return NextResponse.json({ error: "No products found" }, { status: 404 });
      }
      productId = products[0].id;
    }

    const users = await listUsersInProduct(productId);
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
