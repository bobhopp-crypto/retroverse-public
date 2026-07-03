import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { loadPerformanceEditorContext } from "@/lib/ops/media-lab/performance-editor/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  const url = new URL(req.url);
  const episodeId = url.searchParams.get("episode")?.trim();
  const performanceId = url.searchParams.get("performance")?.trim();

  if (!episodeId || !performanceId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const context = await loadPerformanceEditorContext(episodeId, performanceId);
  if (!context) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, context });
}
