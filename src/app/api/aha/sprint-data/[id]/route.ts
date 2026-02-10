import { NextRequest, NextResponse } from "next/server";
import { getRelease, listFeaturesInRelease, listUsersInProduct, listProducts } from "@/lib/aha-client";
import { getDb } from "@/lib/db";
import { daysOff } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parallel fetch: release + features + products
    const [release, features, products] = await Promise.all([
      getRelease(id),
      listFeaturesInRelease(id),
      listProducts().catch(() => []),
    ]);

    // Fetch users for the product (need product ID first)
    const productId = products[0]?.id;
    const users = productId
      ? await listUsersInProduct(productId).catch(() => [])
      : [];

    // Fetch days off from local DB
    const db = getDb();
    const daysOffData = await db.select().from(daysOff);

    return NextResponse.json({
      release,
      features,
      users,
      daysOff: daysOffData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sprint data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
