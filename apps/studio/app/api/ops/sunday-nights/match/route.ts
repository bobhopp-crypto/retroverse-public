import { NextResponse } from "next/server";

import {
  loadMatchCandidates,
  searchMatchManual,
} from "@/lib/sunday-nights/match-candidates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const artist = url.searchParams.get("artist")?.trim() ?? "";
    const title = url.searchParams.get("title")?.trim() ?? "";
    const manualQuery = url.searchParams.get("q")?.trim() ?? "";

    const [autoCandidates, manualCandidates] = await Promise.all([
      artist && title ? loadMatchCandidates(artist, title) : Promise.resolve([]),
      manualQuery.length >= 2 ? searchMatchManual(manualQuery) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      candidates: autoCandidates,
      manualCandidates,
    });
  } catch (err) {
    console.error("[ops/sunday-nights/match GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Match lookup failed" },
      { status: 500 },
    );
  }
}
