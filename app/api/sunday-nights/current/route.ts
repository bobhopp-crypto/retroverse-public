import { NextResponse } from "next/server";

import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadSundayNightsState();
    const payload = await buildSundayNightsCurrentPayload(state);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[sunday-nights/current GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}
