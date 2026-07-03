import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { loadClipReviewContext } from "@/lib/ops/media-collections/midnight-special/clip-review";
import { savePerformanceClipAdjustments } from "@/lib/ops/media-collections/midnight-special/performances";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  const url = new URL(req.url);
  const episodeId = url.searchParams.get("episode")?.trim();
  const performanceId = url.searchParams.get("performance")?.trim();
  const returnHref = url.searchParams.get("return")?.trim();

  if (!episodeId || !performanceId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const context = await loadClipReviewContext(
    episodeId,
    performanceId,
    returnHref || undefined,
  );
  if (!context) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, context });
}

type SaveBody = {
  episode_id?: string;
  performance_id?: string;
  adjusted_start?: number;
  adjusted_end?: number;
};

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const episodeId = body.episode_id?.trim();
  const performanceId = body.performance_id?.trim();
  const adjusted_start = body.adjusted_start;
  const adjusted_end = body.adjusted_end;

  if (
    !episodeId ||
    !performanceId ||
    adjusted_start == null ||
    adjusted_end == null ||
    !Number.isFinite(adjusted_start) ||
    !Number.isFinite(adjusted_end) ||
    adjusted_end <= adjusted_start
  ) {
    return NextResponse.json({ ok: false, error: "invalid_bounds" }, { status: 400 });
  }

  const updated = await savePerformanceClipAdjustments(
    episodeId,
    performanceId,
    Math.max(0, adjusted_start),
    adjusted_end,
  );
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const context = await loadClipReviewContext(episodeId, performanceId);
  return NextResponse.json({ ok: true, record: updated, context });
}
