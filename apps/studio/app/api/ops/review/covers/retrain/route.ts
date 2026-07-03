import { NextResponse } from "next/server";

import { retrainCoverReview } from "@/lib/ops/review/covers/retrain";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function POST() {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "Ops disabled" }, { status: 403 });
  }

  try {
    const { weights } = await retrainCoverReview();
    return NextResponse.json({
      ok: true,
      decisionCount: weights.decisionCount,
      excludedRvals: weights.excludedRvals.length,
      sameArtistWrongBoost: weights.sameArtistWrongBoost,
      needsPullBoost: weights.needsPullBoost,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
