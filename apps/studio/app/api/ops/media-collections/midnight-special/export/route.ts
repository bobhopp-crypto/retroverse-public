import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { exportAcceptedPerformance } from "@/lib/ops/media-collections/midnight-special/export-performance";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  let body: { episode_id?: string; performance_id?: string };
  try {
    body = (await req.json()) as { episode_id?: string; performance_id?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const episodeId = body.episode_id?.trim();
  const performanceId = body.performance_id?.trim();
  if (!episodeId || !performanceId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const result = await exportAcceptedPerformance(episodeId, performanceId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, export: result });
}
