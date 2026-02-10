import { NextRequest, NextResponse } from "next/server";
import { listFeaturesInIteration } from "@/lib/aha-client";
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

    const features = await listFeaturesInIteration(teamProductId, ref, { unestimatedOnly });

    return NextResponse.json({
      features,
      total: features.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch features";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
