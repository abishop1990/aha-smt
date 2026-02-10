import { NextRequest, NextResponse } from "next/server";
import { listFeaturesInRelease, listFeaturesPage } from "@/lib/aha-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const unestimatedOnly = searchParams.get("unestimated") === "true";
    const page = searchParams.get("page");
    const perPage = searchParams.get("per_page");

    // Server-side pagination: ?page=1&per_page=50
    if (page) {
      const result = await listFeaturesPage(id, Number(page), perPage ? Number(perPage) : 200);
      return NextResponse.json(result);
    }

    // Fetch all (legacy / full-list usage)
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
