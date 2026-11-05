import { NextRequest, NextResponse } from "next/server";
import { listFeaturesInProduct } from "@/lib/aha-client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/aha/products/:id/features
 * Returns features for a product, optionally filtered by team_location.
 * ?incomplete=true skips features in a complete workflow state (filtered by Aha, so far fewer requests).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const teamLocation = searchParams.get("teamLocation");
    const tag = searchParams.get("tag");
    const unestimatedOnly = searchParams.get("unestimated") === "true";
    const incompleteOnly = searchParams.get("incomplete") === "true";

    // Get config for workflow kind exclusions
    const { loadConfigFromDb } = await import("@/lib/config.server");
    const { setConfig } = await import("@/lib/config");
    const config = await loadConfigFromDb();
    setConfig(config);

    const features = await listFeaturesInProduct(productId, {
      teamLocation: teamLocation ?? undefined,
      tag: tag ?? undefined,
      unestimatedOnly,
      incompleteOnly,
      excludeWorkflowKinds: config.backlog.excludeWorkflowKinds,
    });

    // Extract unique team_locations from the features as a free by-product
    const team_locations = [...new Set(
      features.map((f) => f.team_location).filter((loc): loc is string => !!loc)
    )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    return NextResponse.json({
      features,
      team_locations,
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
