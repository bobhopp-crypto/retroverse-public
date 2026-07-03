import { NextResponse } from "next/server";

import { buildTrainingSongSnapshot } from "@/lib/ops/studio/training/build-snapshot";
import { normalizeRvtr } from "@/lib/studio/status";

type Params = { params: Promise<{ rvtr: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { rvtr } = await params;
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) {
    return NextResponse.json({ ok: false, error: "invalid_rvtr" }, { status: 400 });
  }

  const snapshot = await buildTrainingSongSnapshot(normalized);
  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, snapshot });
}
