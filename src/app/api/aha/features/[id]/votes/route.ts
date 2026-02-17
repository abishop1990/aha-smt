import { NextRequest, NextResponse } from "next/server";
import { listFeatureVotes, createFeatureVote } from "@/lib/aha-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const votes = await listFeatureVotes(id);
    return NextResponse.json({ votes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch votes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vote = await createFeatureVote(id);
    return NextResponse.json({ vote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create vote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
