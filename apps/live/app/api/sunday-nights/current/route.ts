import { NextResponse } from "next/server";

import {
  getLiveControlStatus,
  maybeAdvanceLiveChannel,
  nextLiveChannelSong,
  startLiveChannel,
  stopLiveChannel,
  updateLiveControlConfig,
} from "@/lib/live-control/engine";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadLiveControlState } from "@/lib/live-control/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await maybeAdvanceLiveChannel();
    const [state, control] = await Promise.all([
      loadSundayNightsState(),
      loadLiveControlState(),
    ]);
    const payload = await buildSundayNightsCurrentPayload(state, control);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[sunday-nights/current GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}
