import { NextResponse } from "next/server";

import {
  normalizeBroadcastSnapshot,
  saveBroadcastSnapshot,
} from "@/lib/bobos/presentation/broadcast-snapshot";
import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";

export const dynamic = "force-dynamic";

/**
 * Broadcast ingest — the deployed site's write path.
 *
 * The local Broadcast Panel pushes a full Broadcast Snapshot here on every
 * operator action (same shared-secret trust model as the VirtualDJ bridge).
 * The deployed player then resolves its playhead from the stored snapshot.
 */
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

  const snapshot = normalizeBroadcastSnapshot(body);
  if (!snapshot) {
    return NextResponse.json({ error: "Invalid broadcast snapshot" }, { status: 400 });
  }

  await saveBroadcastSnapshot(snapshot);
  return NextResponse.json({ ok: true, updatedAt: snapshot.updatedAt });
}
