import { NextResponse } from "next/server";

import { loadMatchCandidates } from "@/lib/sunday-nights/match-candidates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const artist = url.searchParams.get("artist")?.trim() ?? "";
    const title = url.searchParams.get("title")?.trim() ?? "";

    if (!artist || !title) {
      return NextResponse.json({ candidates: [] });
    }

    const candidates = await loadMatchCandidates(artist, title);
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("[ops/sunday-nights/match GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Match lookup failed" },
      { status: 500 },
    );
  }
}
