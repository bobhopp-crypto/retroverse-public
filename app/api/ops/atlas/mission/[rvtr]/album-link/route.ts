import { NextResponse } from "next/server";

import { findAuditMissionRow, loadMissionWorkspaceBundle } from "@/lib/atlas/load-mission";
import { applyHealingAlbumLink } from "@/lib/healing/apply-album-link";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ rvtr: string }> };

type Body = {
  albumId?: number;
  position?: number | null;
  sequenceTitle?: string;
  confidence?: number;
  reasons?: string[];
  sourceKind?: string;
};

export async function POST(req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }
  if (!healingWritesEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        code: "writes_disabled",
        message: "Set RETROVERSE_HEALING_APPLY=1 to enable album linking.",
      },
      { status: 403 },
    );
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

  const albumId = Number(body.albumId);
  if (!Number.isFinite(albumId) || albumId <= 0) {
    return NextResponse.json({ ok: false, error: "albumId required" }, { status: 400 });
  }
  const position =
    body.position == null || body.position === ""
      ? null
      : Number(body.position);
  if (position != null && !Number.isFinite(position)) {
    return NextResponse.json({ ok: false, error: "invalid position" }, { status: 400 });
  }
  if (!body.sequenceTitle?.trim()) {
    return NextResponse.json({ ok: false, error: "sequenceTitle required" }, { status: 400 });
  }
  if (!Array.isArray(body.reasons) || body.reasons.length === 0) {
    return NextResponse.json({ ok: false, error: "reasons required" }, { status: 400 });
  }
  if (!body.sourceKind) {
    return NextResponse.json({ ok: false, error: "sourceKind required" }, { status: 400 });
  }

  const result = await applyHealingAlbumLink(
    {
      rvtr,
      albumId,
      position: position ?? null,
      sequenceTitle: body.sequenceTitle.trim(),
      confidence: Number(body.confidence) || 0,
      reasons: body.reasons,
      sourceKind: body.sourceKind as never,
    },
    "ops/atlas/mission",
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: 409 },
    );
  }

  const bundle = await loadMissionWorkspaceBundle(rvtr);
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    workspace: bundle.workspace,
    coverUrl: bundle.coverUrl,
    proposalId: result.proposalId,
  });
}
