import { NextResponse } from "next/server";

import {
  loadGuestRequestState,
  SongRequestInputError,
  submitSongRequest,
} from "@/lib/song-requests/store";
import { normalizePassSerial } from "@/lib/retroverse-pass/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const serial = normalizePassSerial(new URL(request.url).searchParams.get("serial"));
  if (!serial) return NextResponse.json({ error: "Invalid pass credential." }, { status: 400 });
  try {
    return NextResponse.json(await loadGuestRequestState(serial), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Song requests are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as { serial?: unknown; catalogTrackKey?: unknown; guestComment?: unknown };
  const serial = normalizePassSerial(input.serial);
  if (!serial) return NextResponse.json({ error: "Invalid pass credential." }, { status: 400 });
  try {
    const receipt = await submitSongRequest({
      passSerial: serial,
      catalogTrackKey: typeof input.catalogTrackKey === "string" ? input.catalogTrackKey : "",
      guestComment: typeof input.guestComment === "string" ? input.guestComment : null,
    });
    return NextResponse.json({ ok: true, receipt });
  } catch (error) {
    if (error instanceof SongRequestInputError) {
      const status = error.code === "allowance_used" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Song requests are temporarily unavailable." }, { status: 503 });
  }
}
