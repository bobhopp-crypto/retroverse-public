import { NextResponse } from "next/server";

import type { MatchStatus } from "@/lib/ops/reconciliation-model";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { assertOpsVideoMediaId } from "@/lib/ops/ops-video-media";
import {
  appendOpsActivity,
  loadOpsState,
  saveOpsState,
  type OpsMatchOverride,
} from "@/lib/ops/ops-state-store";

export const dynamic = "force-dynamic";

type MatchBody = {
  chartItemId?: string;
  graphTrackId?: number;
  action?: "approve" | "reject" | "select" | "ignore";
  mediaId?: number | null;
  bestMatch?: string | null;
  matchStatus?: MatchStatus;
  notes?: string | null;
};

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: MatchBody;
  try {
    body = (await request.json()) as MatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const chartItemId = body.chartItemId?.trim();
  const graphTrackId = body.graphTrackId;
  if (!chartItemId || !graphTrackId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  let matchStatus: MatchStatus = body.matchStatus || "needs_review";
  let manualOverride = false;
  const mediaId = body.mediaId ?? null;
  const bestMatch = body.bestMatch?.trim() || null;

  if (
    mediaId != null &&
    (body.action === "approve" || body.action === "select") &&
    !(await assertOpsVideoMediaId(mediaId))
  ) {
    return NextResponse.json(
      { ok: false, error: "media_not_ops_video" },
      { status: 400 },
    );
  }

  if (body.action === "approve" || body.action === "select") {
    matchStatus = "matched";
    manualOverride = true;
  } else if (body.action === "reject") {
    matchStatus = "missing";
    manualOverride = true;
  } else if (body.action === "ignore") {
    matchStatus = "ignored";
    manualOverride = true;
  }

  const override: OpsMatchOverride = {
    chartItemId,
    graphTrackId,
    mediaId,
    manualOverride,
    matchStatus,
    bestMatch,
    notes: body.notes?.trim() || null,
    updatedAt: new Date().toISOString(),
  };

  const state = await loadOpsState();
  state.matchOverrides[chartItemId] = override;
  appendOpsActivity(state, {
    entity: `${chartItemId} · ${bestMatch || "no media"}`,
    action: `match.${body.action || "update"}`,
    source: "ops/reconciliation-state",
    status: "ok",
  });
  await saveOpsState(state);

  return NextResponse.json({ ok: true, override });
}
