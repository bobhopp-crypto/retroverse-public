import { NextResponse } from "next/server";

import { listExportedClipRows } from "@/lib/ops/media-lab/performance-browser/exported";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const clips = await listExportedClipRows();
  return NextResponse.json({ ok: true, clips, total: clips.length });
}
