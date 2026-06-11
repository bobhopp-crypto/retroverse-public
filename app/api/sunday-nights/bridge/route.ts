import { NextResponse } from "next/server";

import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";
import { logLiveNowPlaying } from "@/lib/live-now-playing/logger";
import { applyBridgeLiveUpdate } from "@/lib/sunday-nights/apply-bridge-update";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { BridgeLivePostBody } from "@/lib/sunday-nights/types";

export const dynamic = "force-dynamic";

/** VDJ bridge publish — writes to authoritative Sunday Nights live state. */
export async function POST(req: Request) {
  if (!verifyLiveNowPlayingSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as BridgeLivePostBody;

  try {
    const state = await applyBridgeLiveUpdate(payload);
    const response = await buildSundayNightsCurrentPayload(state);
    return NextResponse.json({ ok: true, ...response });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    await logLiveNowPlaying("api_error", { message, filepath: payload.filepath }).catch(() => {});
    console.error("[sunday-nights/bridge POST]", err);
    const status = message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
