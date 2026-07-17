import { NextResponse } from "next/server";

import { inspectQuery } from "@/lib/inspect/pg";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { scanVdjDatabase } from "@/lib/ops/intelligence/vdj-database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Review tools are development-only." }, { status: 404 });
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all";
  const flagged = new Set((url.searchParams.get("rvtrs") ?? "").split(",").filter((value) => /^RVTR\d{6}$/i.test(value)).map((value) => value.toUpperCase()));
  if (filter === "flagged" && flagged.size === 0) return NextResponse.json({ ok: false, error: "No flagged songs yet." }, { status: 404 });
  if (filter === "vdj") {
    const library = await scanVdjDatabase();
    const candidates = library.entries.filter((entry) => entry.isVideo && /^RVTR\d{6}$/i.test(entry.label));
    for (const entry of candidates.sort(() => Math.random() - 0.5).slice(0, 20)) {
      const rvtr = entry.label.match(/RVTR\d{6}/i)?.[0].toUpperCase();
      if (rvtr && await loadTrackPage(rvtr)) return NextResponse.json({ ok: true, rvtr });
    }
    return NextResponse.json({ ok: false, error: "No valid canonical songs found in the VirtualDJ video library." }, { status: 404 });
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rows = await inspectQuery<{ rvtr: string }>(`SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr FROM canonical_track_display WHERE coalesce(retroverse_track_id, track_id) ~* '^RVTR[0-9]{6}$'${filter === "flagged" ? " AND upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1)" : ""} ORDER BY random() LIMIT 1`, filter === "flagged" ? [Array.from(flagged)] : []);
    const rvtr = rows[0]?.rvtr;
    const track = rvtr ? await loadTrackPage(rvtr) : null;
    if (!track) continue;
    const hasProblems = !track.coverUrl || track.albums.length === 0 || track.trajectoryWeeks.length === 0;
    if (filter === "problems" && !hasProblems) continue;
    if (filter === "complete" && hasProblems) continue;
    return NextResponse.json({ ok: true, rvtr });
  }
  return NextResponse.json({ ok: false, error: "No valid canonical song could be selected." }, { status: 503 });
}
