import { NextRequest, NextResponse } from "next/server";
import { listFeaturesInProduct } from "@/lib/aha-client";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/aha/products/:id/features
 * Returns features for a product, optionally filtered by team_location
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const teamLocation = searchParams.get("teamLocation");
    const unestimatedOnly = searchParams.get("unestimated") === "true";

    // Get config for workflow kind exclusions
    const { loadConfigFromDb } = await import("@/lib/config.server");
    const { setConfig } = await import("@/lib/config");
    const config = await loadConfigFromDb();
    setConfig(config);

    const features = await listFeaturesInProduct(productId, {
      teamLocation: teamLocation ?? undefined,
      unestimatedOnly,
      excludeWorkflowKinds: config.backlog.excludeWorkflowKinds,
    });

    return NextResponse.json({
      features,
      total: features.length,
    });
  } catch (error) {
    console.error("Failed to fetch product features:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch features",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
