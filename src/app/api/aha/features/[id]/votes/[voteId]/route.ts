import { NextRequest, NextResponse } from "next/server";
import { deleteFeatureVote } from "@/lib/aha-client";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; voteId: string }> }
) {
  try {
    const { id, voteId } = await params;
    await deleteFeatureVote(id, voteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete vote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
