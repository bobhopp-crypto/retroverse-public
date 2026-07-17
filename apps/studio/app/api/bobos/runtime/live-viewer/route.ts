import { NextResponse } from "next/server";

import { getRetroverseRuntimeStatus, startRetroverseRuntime } from "@/lib/bobos/runtime/dev-control";
import { LIVE_HEALTH_URL } from "@/lib/bobos/runtime/dev-control-internals";

export const dynamic = "force-dynamic";

const LIVE_VIEWER_PATH = "/review/public-v3";
const LIVE_ORIGIN = new URL(LIVE_HEALTH_URL).origin;

async function status() {
  const runtime = await getRetroverseRuntimeStatus();
  return { runtime, ready: runtime.live.healthy, url: `${LIVE_ORIGIN}${LIVE_VIEWER_PATH}` };
}

export async function GET() {
  try {
    return NextResponse.json(await status());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Live status unavailable" }, { status: 503 });
  }
}

export async function POST() {
  try {
    const current = await status();
    if (current.ready) return NextResponse.json(current);

    await startRetroverseRuntime();
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const next = await status();
      if (next.ready) return NextResponse.json(next);
    }

    return NextResponse.json({ error: "Live server could not be started.", url: current.url }, { status: 504 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Live server could not be started." }, { status: 503 });
  }
}
