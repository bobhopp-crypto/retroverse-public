import { NextResponse } from "next/server";

import { markImportReviewed } from "@/lib/ops/finance/import-batch-service";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const importId = Number(id);
  if (!Number.isFinite(importId)) {
    return NextResponse.json({ error: "Invalid import id" }, { status: 400 });
  }

  try {
    const imp = await markImportReviewed(importId);
    return NextResponse.json({ ok: true, import: imp });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
