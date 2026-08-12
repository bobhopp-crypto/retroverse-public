import { NextResponse } from "next/server";

import { saveChartCoverageDecision } from "@/lib/ops/virtualdj-media-coverage/chart-store";
import type {
  CoverageDecisionAction,
  CoverageDecisionAxis,
} from "@/lib/ops/virtualdj-media-coverage/types";

import { coverageError, requireCoverageOps } from "../../../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS = new Set<CoverageDecisionAction>([
  "accept_ready",
  "require_review",
  "mark_upgrade_recommended",
  "accept_expected_alternate",
  "reject_candidate",
  "mark_missing",
  "skip",
  "clear_decision",
]);
const AXES = new Set<CoverageDecisionAxis>(["audio", "video"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ scanId: string }> },
) {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;
  let body: {
    targetRowKey?: string;
    axis?: CoverageDecisionAxis;
    action?: CoverageDecisionAction;
    note?: string | null;
    selectedPath?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.targetRowKey || !body.axis || !AXES.has(body.axis) || !body.action || !ACTIONS.has(body.action)) {
    return NextResponse.json({ ok: false, error: "Valid target, media axis, and action required" }, { status: 400 });
  }
  try {
    const scan = await saveChartCoverageDecision({
      scanId: (await context.params).scanId,
      targetRowKey: body.targetRowKey,
      axis: body.axis,
      action: body.action,
      note: body.note,
      selectedPath: body.selectedPath,
    });
    return NextResponse.json({ ok: true, scan });
  } catch (error) {
    return coverageError(error, "Could not save decision");
  }
}
