import { NextResponse } from "next/server";

import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { normalizeRvtr } from "@/lib/studio/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const rvtr = normalizeRvtr(url.searchParams.get("rvtr") ?? "");
  if (!rvtr) {
    return NextResponse.json({ error: "Invalid RVTR" }, { status: 400 });
  }

  const songDna = await loadSongDnaPackage(rvtr);
  if (!songDna) {
    return NextResponse.json({ error: "Song DNA not found" }, { status: 404 });
  }

  return NextResponse.json(songDna);
}
