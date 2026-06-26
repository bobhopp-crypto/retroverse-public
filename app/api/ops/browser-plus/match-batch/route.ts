import { NextResponse } from "next/server";

import { loadPackageStatusByRvtr } from "@/lib/ops/browser-plus/browser-plus-artist-match";
import { resolveQueueBatch } from "@/lib/ops/browser-plus/match-queue";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

const MAX_BATCH = 40;

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: {
    rows?: Array<{ rowId: string; filePath: string; artist: string; title: string }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const rows = (body.rows ?? []).slice(0, MAX_BATCH);
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "rows required" }, { status: 400 });
  }

  try {
    const packageStatusByRvtr = await loadPackageStatusByRvtr();
    const items = await resolveQueueBatch(rows, packageStatusByRvtr);
    return NextResponse.json({
      ok: true,
      items,
      scored: items.length,
      total: rows.length,
    });
  } catch (err) {
    console.error("[ops/browser-plus/match-batch POST]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Batch match failed" },
      { status: 500 },
    );
  }
}
