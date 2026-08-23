import { NextResponse } from "next/server";

import {
  JukeboxRelayInputError,
  loadPublicJukeboxRelayCatalog,
} from "@/lib/song-requests/jukebox-relay-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    return NextResponse.json(await loadPublicJukeboxRelayCatalog({
      sessionToken: url.searchParams.get("session") ?? "",
      query: url.searchParams.get("q") ?? "",
      limit: Number(url.searchParams.get("limit") ?? "60"),
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof JukeboxRelayInputError) {
      const status = error.code === "closed" || error.code === "stale" ? 423 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "The request catalog is temporarily unavailable." }, { status: 503 });
  }
}
