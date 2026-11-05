import { NextResponse } from "next/server";
import { getIterationDetail, listUsersInProduct } from "@/lib/aha-client";
import { getEnv } from "@/lib/env";

export async function GET(
  _request: Request,
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

    const [detail, users] = await Promise.all([
      getIterationDetail(ref),
      listUsersInProduct(teamProductId),
    ]);

    if (!detail) {
      return NextResponse.json(
        { error: "Iteration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...detail, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch iteration data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
