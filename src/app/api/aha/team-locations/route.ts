import { NextRequest, NextResponse } from "next/server";
import { listTeamLocations } from "@/lib/aha-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/aha/team-locations
 * Returns unique team_location values from all features in the team product
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId query parameter is required" },
        { status: 400 }
      );
    }

    const team_locations = await listTeamLocations(productId);

    return NextResponse.json({
      team_locations,
    });
  } catch (error) {
    console.error("Failed to fetch team locations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch team locations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
