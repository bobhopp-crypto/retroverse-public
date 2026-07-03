import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { markMediaSyncReviewed } from "@/lib/ops/media-sync/media-sync-state";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: { rowId?: string };
  try {
    body = (await request.json()) as { rowId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const rowId = body.rowId?.trim();
  if (!rowId) {
    return NextResponse.json({ ok: false, error: "missing_row_id" }, { status: 400 });
  }

  const state = await markMediaSyncReviewed(rowId);
  return NextResponse.json({ ok: true, reviewedIds: state.reviewedIds });
}
