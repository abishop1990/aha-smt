import { NextRequest, NextResponse } from "next/server";
import { listEpicsForProduct } from "@/lib/aha-client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/aha/products/:id/epics
 * Returns epics for a product.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const epics = await listEpicsForProduct(productId);
    return NextResponse.json({ epics });
  } catch (error) {
    console.error("Failed to fetch product epics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch epics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
