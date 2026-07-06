import { NextResponse } from "next/server";

import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadLiveControlState } from "@/lib/live-control/state";
import { tickLiveControl } from "@/lib/live-control/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await tickLiveControl();
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
