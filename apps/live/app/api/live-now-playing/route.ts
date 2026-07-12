import { NextResponse } from "next/server";

import {
  loadPublicCurrentSongPayload,
  PUBLIC_CURRENT_NO_STORE_HEADERS,
} from "@/lib/home/public-current-song";
import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";
import { applyBridgeLiveUpdate } from "@/lib/sunday-nights/apply-bridge-update";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { BridgeLivePostBody } from "@/lib/sunday-nights/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** Read alias — same payload as /api/sunday-nights/current. */
export async function GET() {
  try {
    const payload = await loadPublicCurrentSongPayload();
    return NextResponse.json(payload, { headers: PUBLIC_CURRENT_NO_STORE_HEADERS });
  } catch (err) {
    console.error("[live-now-playing GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500, headers: PUBLIC_CURRENT_NO_STORE_HEADERS },
    );
  }
}

/** Write alias — forwards to Sunday Nights bridge publish. */
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
    console.error("[live-now-playing POST]", err);
    const status = message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
