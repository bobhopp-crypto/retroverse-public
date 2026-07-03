import { NextResponse } from "next/server";

import { getImportBatch } from "@/lib/ops/finance/import-batch-service";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const importId = Number(id);
  if (!Number.isFinite(importId)) {
    return NextResponse.json({ error: "Invalid import id" }, { status: 400 });
  }

  const batch = await getImportBatch(importId);
  if (!batch) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  return NextResponse.json(batch);
}
