import { NextRequest, NextResponse } from "next/server";
import { getFeature, updateFeatureScore } from "@/lib/aha-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feature = await getFeature(id);
    return NextResponse.json(feature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch feature";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (typeof body.score !== "number") {
      return NextResponse.json({ error: "score must be a number" }, { status: 400 });
    }

    const feature = await updateFeatureScore(id, body.score);
    return NextResponse.json(feature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update feature";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
