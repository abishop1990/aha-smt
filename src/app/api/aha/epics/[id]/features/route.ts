import { NextRequest, NextResponse } from "next/server";
import { listFeaturesForEpic } from "@/lib/aha-client";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: epicRef } = await context.params;
    const unestimatedOnly = request.nextUrl.searchParams.get("unestimated") === "true";
    const features = await listFeaturesForEpic(epicRef, { unestimatedOnly });
    return NextResponse.json({ features, total: features.length });
  } catch (error) {
    console.error("Failed to fetch epic features:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch features",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
