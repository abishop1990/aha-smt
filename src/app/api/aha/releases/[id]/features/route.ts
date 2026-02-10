import { NextRequest, NextResponse } from "next/server";
import { listFeaturesInRelease } from "@/lib/aha-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const unestimatedOnly = searchParams.get("unestimated") === "true";

    const features = await listFeaturesInRelease(id, { unestimatedOnly });

    return NextResponse.json({
      features,
      total: features.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch features";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
