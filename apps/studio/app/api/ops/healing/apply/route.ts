import { NextResponse } from "next/server";

import { applyHealingAlbumLink } from "@/lib/healing/apply-album-link";
import type { AlbumLinkApplyRequest } from "@/lib/healing/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";

export const dynamic = "force-dynamic";

type Body = AlbumLinkApplyRequest & { actor?: string };

/**
 * Human-approved album link apply — requires RETROVERSE_OPS=1 + RETROVERSE_HEALING_APPLY=1.
 * One INSERT per request. No bulk. No auto-select.
 */
export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }
  if (!healingWritesEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        code: "writes_disabled",
        message: "Set RETROVERSE_HEALING_APPLY=1 to enable healing writes.",
      },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rvtr = body.rvtr?.trim();
  if (!rvtr) {
    return NextResponse.json({ ok: false, error: "rvtr required" }, { status: 400 });
  }
  if (!Number.isFinite(body.albumId) || body.albumId <= 0) {
    return NextResponse.json({ ok: false, error: "albumId required" }, { status: 400 });
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

  const actor = body.actor?.trim() || "ops/healing-ui";

  const result = await applyHealingAlbumLink(
    {
      rvtr,
      albumId: body.albumId,
      position: body.position ?? null,
      sequenceTitle: body.sequenceTitle.trim(),
      confidence: Number(body.confidence) || 0,
      reasons: body.reasons,
      sourceKind: body.sourceKind,
    },
    actor,
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    proposalId: result.proposalId,
    catRowId: result.catRowId,
    revalidated: result.revalidated,
    revalidatedPaths: result.revalidatedPaths,
  });
}
