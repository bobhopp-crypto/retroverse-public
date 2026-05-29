import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { loadVdjCandidates } from "@/lib/ops/load-vdj-candidates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  const url = new URL(request.url);
  const graphTrackId = Number(url.searchParams.get("graphTrackId"));
  const artist = url.searchParams.get("artist") || "";
  const title = url.searchParams.get("title") || "";

  if (!Number.isFinite(graphTrackId) || graphTrackId <= 0) {
    return NextResponse.json({ ok: false, error: "bad_graph_track_id" }, { status: 400 });
  }

  const candidates = await loadVdjCandidates({ graphTrackId, artist, title });
  return NextResponse.json({ ok: true, candidates });
}
