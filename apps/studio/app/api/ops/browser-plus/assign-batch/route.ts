import { NextResponse } from "next/server";

import { assignVdjLabelsBatch } from "@/lib/ops/browser-plus/vdj-label-write";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

const MAX_BATCH = 200;

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: { items?: Array<{ filePath: string; rvtr: string }> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body.items ?? []).slice(0, MAX_BATCH);
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
  }

  try {
    const result = await assignVdjLabelsBatch(items);
    return NextResponse.json({ ok: result.ok > 0, result });
  } catch (err) {
    console.error("[ops/browser-plus/assign-batch POST]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Batch assign failed" },
      { status: 500 },
    );
  }
}
