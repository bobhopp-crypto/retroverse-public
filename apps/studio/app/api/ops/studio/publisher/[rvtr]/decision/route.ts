import { NextResponse } from "next/server";

import { appendPipelineEvent } from "@/lib/ops/studio/department-status/pipeline-events";
import { setDepartmentComplete } from "@/lib/ops/studio/department-status/runtime-progress";
import { evaluatePublisherPackage } from "@/lib/ops/studio/publisher/evaluate";
import { recordPublisherDecision } from "@/lib/ops/studio/publisher/store";
import type { PublisherDecisionAction } from "@/lib/ops/studio/publisher/types";
import { recordPublisherDirectorFeedback } from "@/lib/ops/studio/director/coaching";
import { saveTrainingReview } from "@/lib/ops/studio/training/store";
import { normalizeRvtr } from "@/lib/studio/status";

const ACTIONS: PublisherDecisionAction[] = [
  "approve",
  "approve_extended",
  "approve_showcase",
  "return_editor",
  "return_director",
];

type RouteContext = { params: Promise<{ rvtr: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { rvtr: rvtrParam } = await context.params;
  const normalized = normalizeRvtr(rvtrParam);
  if (!normalized) {
    return NextResponse.json({ ok: false, error: "invalid_rvtr" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const input = body as {
    action?: string;
    reason?: string;
    reviewer?: string;
  };

  if (!input.action || !ACTIONS.includes(input.action as PublisherDecisionAction)) {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  await evaluatePublisherPackage(normalized);

  try {
    const record = await recordPublisherDecision({
      rvtr: normalized,
      action: input.action as PublisherDecisionAction,
      reviewer: input.reviewer ?? "operator",
      reason: input.reason ?? "",
    });

    const isApproval =
      input.action === "approve" ||
      input.action === "approve_extended" ||
      input.action === "approve_showcase";

    await saveTrainingReview({
      rvtr: normalized,
      department: "publisher",
      verdict: isApproval ? "approve" : "needs_coaching",
      note: input.reason ?? null,
    });

    if (input.action === "return_director") {
      await recordPublisherDirectorFeedback({
        rvtr: normalized,
        action: input.action,
        reason: input.reason ?? "",
      });
    }

    if (isApproval) {
      await appendPipelineEvent({
        at: new Date().toISOString(),
        department: "publisher",
        type: "published",
        message: `${input.action.replace(/_/g, " ")} — ${record.title}`,
        rvtr: normalized,
      });
      await setDepartmentComplete("publisher", {
        rvtr: normalized,
        artist: record.artist,
        title: record.title,
        coverUrl: record.coverUrl,
      });
    }

    return NextResponse.json({ ok: true, record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "decision_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
