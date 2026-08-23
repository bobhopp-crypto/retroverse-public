import { NextResponse } from "next/server";

import {
  createJukeboxSession,
  endJukeboxSession,
  JukeboxInputError,
  loadJukeboxPublicState,
  loadJukeboxSession,
  submitJukeboxRequest,
} from "@/lib/song-requests/jukebox-local-store";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof JukeboxInputError) {
    const status = error.code === "closed" ? 423 : error.code === "session" ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  return NextResponse.json({ error: "The video jukebox is temporarily unavailable." }, { status: 503 });
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
  try {
    const payload = sessionId
      ? { state: await loadJukeboxPublicState(), session: await loadJukeboxSession(sessionId) }
      : { state: await loadJukeboxPublicState(), session: null };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as {
    action?: unknown;
    nickname?: unknown;
    sessionId?: unknown;
    catalogTrackKey?: unknown;
  };
  try {
    if (input.action === "start-session") {
      const session = await createJukeboxSession(typeof input.nickname === "string" ? input.nickname : null);
      return NextResponse.json({ ok: true, session });
    }
    if (input.action === "end-session") {
      await endJukeboxSession(typeof input.sessionId === "string" ? input.sessionId : "");
      return NextResponse.json({ ok: true });
    }
    if (input.action === "request") {
      const receipt = await submitJukeboxRequest({
        sessionId: typeof input.sessionId === "string" ? input.sessionId : "",
        catalogTrackKey: typeof input.catalogTrackKey === "string" ? input.catalogTrackKey : "",
      });
      return NextResponse.json({ ok: true, receipt });
    }
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
