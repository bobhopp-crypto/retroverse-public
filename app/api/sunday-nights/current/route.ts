import { NextResponse } from "next/server";

import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadTrackPage } from "@/lib/track/load-track-page";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadSundayNightsState();
    const track = state.currentTrackId
      ? await loadTrackPage(state.currentTrackId)
      : null;

    return NextResponse.json({
      currentTrackId: state.currentTrackId,
      updatedAt: state.updatedAt,
      track,
    });
  } catch (err) {
    console.error("[sunday-nights/current GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}
