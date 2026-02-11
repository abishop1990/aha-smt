import { NextResponse } from "next/server";
import { getIteration, listFeaturesInIteration, listUsersInProduct } from "@/lib/aha-client";
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

    // GraphQL returns iteration+features in a single cached call,
    // so these two share the same underlying request
    const [iteration, features, users] = await Promise.all([
      getIteration(teamProductId, ref),
      listFeaturesInIteration(teamProductId, ref),
      listUsersInProduct(teamProductId),
    ]);

    if (!iteration) {
      return NextResponse.json(
        { error: "Iteration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ iteration, features, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch iteration data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
