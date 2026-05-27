import { NextResponse } from "next/server";

import { applyHealingAlbumLink } from "@/lib/healing/apply-album-link";
import type { AlbumLinkApplyRequest } from "@/lib/healing/types";

export const dynamic = "force-dynamic";

type Body = AlbumLinkApplyRequest & { actor?: string };

/** Human-approved album link apply — gated by RETROVERSE_HEALING_APPLY=1. */
export async function POST(request: Request) {
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

  const actor = body.actor?.trim() || "ops/healing";

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
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    proposalId: result.proposalId,
    catRowId: result.catRowId,
    revalidated: result.revalidated,
  });
}
