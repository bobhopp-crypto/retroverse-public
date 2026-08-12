import { NextResponse } from "next/server";

import { loadGuestCatalog, SongRequestInputError } from "@/lib/song-requests/store";
import { normalizePassSerial } from "@/lib/retroverse-pass/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const serial = normalizePassSerial(url.searchParams.get("serial"));
  if (!serial) return NextResponse.json({ error: "Invalid pass credential." }, { status: 400 });
  const sort = url.searchParams.get("sort") === "artist" ? "artist" : "title";
  try {
    return NextResponse.json(
      await loadGuestCatalog({
        passSerial: serial,
        query: url.searchParams.get("q") ?? "",
        sort,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SongRequestInputError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Song requests are temporarily unavailable." }, { status: 503 });
  }
}
