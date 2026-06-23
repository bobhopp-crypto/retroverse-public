import { NextResponse } from "next/server";

import {
  getLiveControlStatus,
  maybeAdvanceLiveChannel,
  nextLiveChannelSong,
  startLiveChannel,
  stopLiveChannel,
  updateLiveControlConfig,
} from "@/lib/live-control/engine";
import type { LiveControlConfig } from "@/lib/live-control/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await maybeAdvanceLiveChannel();
    const status = await getLiveControlStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error("[ops/live-control GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { op?: string; config?: Partial<LiveControlConfig> };

  try {
    if (payload.op === "start") {
      const control = await startLiveChannel(payload.config);
      const status = await getLiveControlStatus();
      return NextResponse.json({ ...status, control });
    }

    if (payload.op === "stop") {
      const control = await stopLiveChannel();
      const status = await getLiveControlStatus();
      return NextResponse.json({ ...status, control });
    }

    if (payload.op === "next") {
      await maybeAdvanceLiveChannel();
      const control = await nextLiveChannelSong();
      const status = await getLiveControlStatus();
      return NextResponse.json({ ...status, control });
    }

    if (payload.op === "updateConfig") {
      const control = await updateLiveControlConfig(payload.config ?? {});
      const status = await getLiveControlStatus();
      return NextResponse.json({ ...status, control });
    }

    if (payload.op === "tick") {
      await maybeAdvanceLiveChannel();
      const status = await getLiveControlStatus();
      return NextResponse.json(status);
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    console.error("[ops/live-control PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
