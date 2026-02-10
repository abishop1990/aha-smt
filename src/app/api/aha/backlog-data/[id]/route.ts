import { NextRequest, NextResponse } from "next/server";
import { listFeaturesInRelease, listUsersInProduct, listProducts } from "@/lib/aha-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [features, products] = await Promise.all([
      listFeaturesInRelease(id),
      listProducts().catch(() => []),
    ]);

    const productId = products[0]?.id;
    const users = productId
      ? await listUsersInProduct(productId).catch(() => [])
      : [];

    return NextResponse.json({
      features,
      users,
      total: features.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch backlog data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
