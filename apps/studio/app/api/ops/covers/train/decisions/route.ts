import { NextResponse } from "next/server";

import {
  saveTrainingDecision,
  type CoverTrainingDecisionValue,
} from "@/lib/rv12/training-decisions";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

const VALID: CoverTrainingDecisionValue[] = ["correct", "wrong", "unsure", "needs_pull"];

export async function POST(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "Ops disabled" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const rval = String(b.rval ?? "")
    .trim()
    .toUpperCase();
  if (!/^RVAL\d{6}$/.test(rval)) {
    return NextResponse.json({ ok: false, error: "Invalid RVAL" }, { status: 400 });
  }

  const decision = String(b.decision ?? "") as CoverTrainingDecisionValue;
  if (!VALID.includes(decision)) {
    return NextResponse.json({ ok: false, error: "Invalid decision" }, { status: 400 });
  }

  const confidence = String(b.confidence ?? "medium");
  const conf =
    confidence === "high" || confidence === "low" ? confidence : ("medium" as const);

  try {
    const saved = await saveTrainingDecision({
      rval,
      artist: String(b.artist ?? ""),
      album: String(b.album ?? ""),
      releaseYear:
        b.releaseYear == null || b.releaseYear === ""
          ? null
          : Number(b.releaseYear),
      currentHash: b.currentHash ? String(b.currentHash) : null,
      proposedHash: b.proposedHash ? String(b.proposedHash) : null,
      proposedSource: b.proposedSource ? String(b.proposedSource) : null,
      decision,
      confidence: conf,
      reason: String(b.reason ?? ""),
    });
    return NextResponse.json({ ok: true, decision: saved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
