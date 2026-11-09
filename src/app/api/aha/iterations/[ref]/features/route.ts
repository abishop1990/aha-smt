import { NextRequest, NextResponse } from "next/server";
import { getIterationDetail } from "@/lib/aha-client";
import { isUnestimated } from "@/lib/points";
import { getEnv } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const env = getEnv();
    const teamProductId = env.AHA_TEAM_PRODUCT_ID;

    if (!teamProductId) {
      return NextResponse.json(
        { error: "AHA_TEAM_PRODUCT_ID is not configured" },
        { status: 400 }
      );
    }

    const { searchParams } = request.nextUrl;
    const unestimatedOnly = searchParams.get("unestimated") === "true";

    // One Aha request returns the iteration, its features and team capacity
    const detail = await getIterationDetail(ref);
    if (!detail) {
      return NextResponse.json({ error: "Iteration not found" }, { status: 404 });
    }

    const features = unestimatedOnly ? detail.features.filter(isUnestimated) : detail.features;

    return NextResponse.json({
      features,
      total: features.length,
      iteration: detail.iteration,
      teamCapacity: detail.teamCapacity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch features";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
