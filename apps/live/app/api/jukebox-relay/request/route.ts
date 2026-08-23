import { NextResponse } from "next/server";

import {
  JukeboxRelayInputError,
  submitPublicJukeboxRelayRequest,
} from "@/lib/song-requests/jukebox-relay-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096) return NextResponse.json({ error: "Invalid request." }, { status: 413 });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: "Invalid request." }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  try {
    const receipt = await submitPublicJukeboxRelayRequest({
      publicRequestId: typeof input.publicRequestId === "string" ? input.publicRequestId : "",
      sessionToken: typeof input.sessionToken === "string" ? input.sessionToken : "",
      guestId: typeof input.guestId === "string" ? input.guestId : "",
      nickname: typeof input.nickname === "string" ? input.nickname : null,
      trackKey: typeof input.trackKey === "string" ? input.trackKey : "",
    });
    return NextResponse.json({ ok: true, receipt });
  } catch (error) {
    if (error instanceof JukeboxRelayInputError) {
      const status = error.code === "limit" ? 409 : error.code === "closed" || error.code === "stale" ? 423 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "The request could not be sent." }, { status: 503 });
  }
}
