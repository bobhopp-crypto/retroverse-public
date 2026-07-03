import { NextResponse } from "next/server";

import { saveTrainingReview } from "@/lib/ops/studio/training/store";
import { TRAINING_DEPARTMENTS, type TrainingDepartmentId, type TrainingReviewVerdict } from "@/lib/ops/studio/training/types";
import { normalizeRvtr } from "@/lib/studio/status";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const input = body as {
    rvtr?: string;
    department?: string;
    verdict?: string;
    note?: string | null;
  };

  const normalized = normalizeRvtr(input.rvtr ?? "");
  if (!normalized) {
    return NextResponse.json({ ok: false, error: "invalid_rvtr" }, { status: 400 });
  }

  if (!TRAINING_DEPARTMENTS.includes(input.department as TrainingDepartmentId)) {
    return NextResponse.json({ ok: false, error: "invalid_department" }, { status: 400 });
  }

  const verdict = input.verdict as TrainingReviewVerdict;
  if (!["approve", "needs_coaching", "reject"].includes(verdict)) {
    return NextResponse.json({ ok: false, error: "invalid_verdict" }, { status: 400 });
  }

  const record = await saveTrainingReview({
    rvtr: normalized,
    department: input.department as TrainingDepartmentId,
    verdict,
    note: input.note ?? null,
  });

  return NextResponse.json({ ok: true, review: record });
}
