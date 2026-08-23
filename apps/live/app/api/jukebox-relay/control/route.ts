import { NextResponse } from "next/server";

import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";
import {
  applyPublicJukeboxRelayControl,
  JukeboxRelayInputError,
} from "@/lib/song-requests/jukebox-relay-store";
import type { PublicJukeboxRelayTrack } from "@/lib/song-requests/jukebox-relay-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyLiveNowPlayingSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16_000_000) return NextResponse.json({ error: "Invalid request." }, { status: 413 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  try {
    await applyPublicJukeboxRelayControl({
      sessionToken: typeof input.sessionToken === "string" ? input.sessionToken : "",
      isOpen: input.isOpen === true,
      requestLimit: input.requestLimit == null ? null : Number(input.requestLimit),
      ...(Array.isArray(input.catalog) ? { catalog: input.catalog as PublicJukeboxRelayTrack[] } : {}),
      ended: input.ended === true,
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
          : "Relay control is unavailable.",
      },
      { status: 503 },
    );
  }
}
