import { NextResponse } from "next/server";

import { automaticCoverCandidates } from "@/lib/retroverse-2/cover-correction";
import { loadSongControlPackage, songControlData } from "@/lib/retroverse-2/song-control";
import { loadTrackPage } from "@/lib/track/load-track-page";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Props) {
  const { rvtr } = await params;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const track = await loadTrackPage(rvtr);
  if (!track) return NextResponse.json({ candidates: [] }, { status: 404 });

  const pkg = await loadSongControlPackage(track);
  const locked = songControlData(pkg).locks.cover === true;
  const candidates = await automaticCoverCandidates(track, locked, q);

  return NextResponse.json({ candidates });
}
