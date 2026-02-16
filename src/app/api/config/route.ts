import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/config
 * Returns the current application configuration
 */
export async function GET() {
  try {
    const config = getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to load config:", error);
    return NextResponse.json(
      {
        error: "Failed to load configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
