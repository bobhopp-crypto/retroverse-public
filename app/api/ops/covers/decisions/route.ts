import { NextResponse } from "next/server";

import type { CoverRepairDecisionValue } from "@/lib/cover-integrity/repair-decisions-store";
import {
  loadRepairDecisions,
  saveRepairDecision,
} from "@/lib/cover-integrity/repair-decisions-store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

const DECISIONS = new Set<CoverRepairDecisionValue>(["approve", "reject", "skip"]);

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  const state = await loadRepairDecisions();
  return NextResponse.json({ ok: true, ...state });
}

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: {
    rval?: string;
    decision?: string;
    curatorNotes?: string;
    proposedSource?: string;
    proposedCoverUrlOrPath?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const rval = body.rval?.trim().toUpperCase();
  const decision = body.decision?.trim().toLowerCase() as CoverRepairDecisionValue;

  if (!rval || !/^RVAL\d{6}$/.test(rval)) {
    return NextResponse.json({ ok: false, error: "invalid_rval" }, { status: 400 });
  }
  if (!DECISIONS.has(decision)) {
    return NextResponse.json({ ok: false, error: "invalid_decision" }, { status: 400 });
  }

  const state = await saveRepairDecision({
    rval,
    decision,
    curatorNotes: body.curatorNotes?.trim() ?? "",
    reviewedAt: new Date().toISOString(),
    proposedSource: body.proposedSource?.trim() ?? "",
    proposedCoverUrlOrPath: body.proposedCoverUrlOrPath?.trim() ?? "",
  });

  return NextResponse.json({ ok: true, decision: state.decisions[rval], updatedAt: state.updatedAt });
}
