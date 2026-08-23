import { NextResponse } from "next/server";

import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";
import {
  acknowledgePublicJukeboxRelayRequests,
  JukeboxRelayInputError,
} from "@/lib/song-requests/jukebox-relay-store";
import type { PublicJukeboxRelayAck } from "@/lib/song-requests/jukebox-relay-types";

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
    await acknowledgePublicJukeboxRelayRequests({
      sessionToken: typeof input.sessionToken === "string" ? input.sessionToken : "",
      acknowledgements: Array.isArray(input.acknowledgements)
        ? input.acknowledgements as PublicJukeboxRelayAck[]
        : [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof JukeboxRelayInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Relay acknowledgement is unavailable.",
      },
      { status: 503 },
    );
  }
}
