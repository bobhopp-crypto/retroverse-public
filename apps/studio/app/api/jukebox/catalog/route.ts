import { NextResponse } from "next/server";

import {
  JukeboxInputError,
  loadJukeboxCatalog,
} from "@/lib/song-requests/jukebox-local-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const rawDecade = url.searchParams.get("decade");
  const rawLimit = Number(url.searchParams.get("limit") ?? 60);
  try {
    return NextResponse.json(
      await loadJukeboxCatalog({
        query: url.searchParams.get("q") ?? "",
        decade: rawDecade == null ? null : Number(rawDecade),
        mode: mode === "popular" || mode === "recent" ? mode : "browse",
        limit: Number.isFinite(rawLimit) ? rawLimit : 60,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof JukeboxInputError) {
      return NextResponse.json({ error: error.message }, { status: 423 });
    }
    return NextResponse.json({ error: "The video catalog is temporarily unavailable." }, { status: 503 });
  }
}
