import { NextResponse } from "next/server";

import { updateImportStagingRow } from "@/lib/ops/finance/db/import-staging";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; rowId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const { id, rowId } = await ctx.params;
  const importId = Number(id);
  const stagingId = Number(rowId);
  if (!Number.isFinite(importId) || !Number.isFinite(stagingId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await ensureFinanceSchema();
  const body = (await request.json()) as {
    transactionDate?: string;
    merchant?: string;
    description?: string;
    amount?: number;
    proposedAccount?: string | null;
    notes?: string | null;
  };

  await updateImportStagingRow(importId, stagingId, body);
  return NextResponse.json({ ok: true });
}
