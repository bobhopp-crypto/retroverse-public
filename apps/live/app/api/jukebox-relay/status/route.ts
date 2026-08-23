import { NextResponse } from "next/server";

import { loadPublicJukeboxRelayStatus } from "@/lib/song-requests/jukebox-relay-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadPublicJukeboxRelayStatus(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { isOpen: false, sessionToken: null },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
