import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { updatePerformanceRecord } from "@/lib/ops/media-collections/midnight-special/performances";
import type { PerformanceStatus } from "@/lib/ops/media-collections/midnight-special/types";

export const dynamic = "force-dynamic";

type ReviewBody = {
  episode_id?: string;
  performance_id?: string;
  action?: "accept" | "reject" | "adjust" | "pending";
  artist?: string;
  song?: string;
  start_sec?: number;
  end_sec?: number;
  review_notes?: string;
};

function actionToStatus(action: ReviewBody["action"]): PerformanceStatus {
  if (action === "accept") return "accepted";
  if (action === "reject") return "rejected";
  if (action === "adjust") return "accepted";
  return "review";
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  let body: ReviewBody;
  try {
    body = (await req.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const episodeId = body.episode_id?.trim();
  const performanceId = body.performance_id?.trim();
  if (!episodeId || !performanceId || !body.action) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const updated = await updatePerformanceRecord(episodeId, performanceId, {
    status: actionToStatus(body.action),
    artist: body.artist,
    song: body.song,
    start_seconds: body.start_sec,
    end_seconds: body.end_sec,
    review_notes: body.review_notes,
    manually_edited:
      body.action === "adjust" || body.start_sec != null || body.end_sec != null,
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { episodeManifestToCandidateShape } = await import(
    "@/lib/ops/media-collections/midnight-special/performances"
  );
  const shaped = episodeManifestToCandidateShape({
    version: 1,
    collection_id: "midnight_special",
    episode_id: episodeId,
    episode_title: updated.episode_title,
    source_url: updated.source_url,
    video_path: "",
    generated_at: new Date().toISOString(),
    parser_version: "ms-perf-v1",
    performances: [updated],
  });

  return NextResponse.json({ ok: true, performance: shaped.performances[0] });
}
