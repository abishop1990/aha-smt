import { NextRequest, NextResponse } from "next/server";
import { getFeature, updateFeatureScore, updateFeatureWorkUnits } from "@/lib/aha-client";

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

    let feature;
    if (typeof body.work_units === "number") {
      feature = await updateFeatureWorkUnits(id, body.work_units);
    } else if (typeof body.score === "number") {
      feature = await updateFeatureScore(id, body.score);
    } else {
      return NextResponse.json(
        { error: "score or work_units must be a number" },
        { status: 400 }
      );
    }

    return NextResponse.json(feature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update feature";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
