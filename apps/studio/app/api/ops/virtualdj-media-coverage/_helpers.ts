import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

export function requireCoverageOps() {
  return isOpsEnabled()
    ? null
    : NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
}

export function coverageError(error: unknown, fallback: string, status = 500) {
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : fallback },
    { status },
  );
}

