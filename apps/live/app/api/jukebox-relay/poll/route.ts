import { NextResponse } from "next/server";

import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";
import {
  JukeboxRelayInputError,
  pollPublicJukeboxRelayInbox,
} from "@/lib/song-requests/jukebox-relay-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyLiveNowPlayingSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  try {
    const requests = await pollPublicJukeboxRelayInbox(
      typeof input.sessionToken === "string" ? input.sessionToken : "",
    );
    return NextResponse.json({ requests });
  } catch (error) {
    if (error instanceof JukeboxRelayInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Relay polling is unavailable." }, { status: 503 });
  }
}
