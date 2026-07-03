import { NextResponse } from "next/server";

import { rollbackHealingAlbumLink } from "@/lib/healing/apply-album-link";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";

export const dynamic = "force-dynamic";

type Body = { proposalId?: number; actor?: string };

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }
  if (!healingWritesEnabled()) {
    return NextResponse.json(
      { ok: false, code: "writes_disabled", message: "RETROVERSE_HEALING_APPLY=1 required." },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const proposalId = Number(body.proposalId);
  if (!Number.isFinite(proposalId) || proposalId <= 0) {
    return NextResponse.json({ ok: false, error: "proposalId required" }, { status: 400 });
  }

  const actor = body.actor?.trim() || "ops/healing";
  const result = await rollbackHealingAlbumLink(proposalId, actor);

  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    proposalId: result.proposalId,
    catRowId: result.catRowId,
    revalidatedPaths: result.revalidatedPaths,
  });
}
