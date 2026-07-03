import { NextResponse } from "next/server";

import { findAuditMissionRow, loadMissionWorkspaceBundle } from "@/lib/atlas/load-mission";
import { saveMissionCommentary } from "@/lib/atlas/mission-live-state";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { normalizeRvTags, type RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import {
  isReviewClassification,
  type ReviewClassification,
} from "@/lib/ops/year-workspace/review-types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ rvtr: string }> };

type Body = {
  tags?: string[];
  classification?: string;
};

export async function POST(req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr: rvtrParam } = await params;
  const rvtr = rvtrParam.trim().toUpperCase();
  const auditRow = await findAuditMissionRow(rvtr);
  if (!auditRow) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const tags = normalizeRvTags(Array.isArray(body.tags) ? body.tags : []) as RvTagId[];
  const classification = body.classification?.trim() ?? "";
  if (!isReviewClassification(classification)) {
    return NextResponse.json({ ok: false, error: "invalid_classification" }, { status: 400 });
  }

  await saveMissionCommentary({
    rvtr,
    auditRow,
    tags,
    classification: classification as ReviewClassification,
  });

  const bundle = await loadMissionWorkspaceBundle(rvtr);
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, workspace: bundle.workspace, coverUrl: bundle.coverUrl });
}
