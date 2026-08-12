import { NextResponse } from "next/server";

import { loadActiveRequestEvent, activateRequestSource, SongRequestInputError } from "@/lib/song-requests/store";
import { discoverVirtualDjSources, loadVirtualDjSourceSelection } from "@/lib/song-requests/vdj-sources";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const discovery = await discoverVirtualDjSources();
    let activeEvent = null;
    let databaseReady = true;
    try {
      activeEvent = await loadActiveRequestEvent();
    } catch {
      databaseReady = false;
    }
    return NextResponse.json(
      { discovery, activeEvent, databaseReady },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "VirtualDJ discovery failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as { eventId?: unknown; eventTitle?: unknown; sourceKey?: unknown };
  if (typeof input.eventId !== "string" || typeof input.sourceKey !== "string") {
    return NextResponse.json({ error: "Event and VirtualDJ source are required." }, { status: 400 });
  }
  try {
    const selection = await loadVirtualDjSourceSelection(input.sourceKey);
    const activeEvent = await activateRequestSource({
      eventId: input.eventId,
      eventTitle: typeof input.eventTitle === "string" ? input.eventTitle : input.eventId,
      selection,
    });
    return NextResponse.json({ ok: true, activeEvent });
  } catch (error) {
    if (error instanceof SongRequestInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Source activation failed." },
      { status: 500 },
    );
  }
}
