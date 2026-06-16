import { NextResponse } from "next/server";

import { categorizeTransactions } from "@/lib/ops/finance/db/transactions";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const body = (await request.json()) as {
    transactionIds?: number[];
    accountId?: number;
    /** @deprecated */
    categorySlug?: string;
    importance?: string | null;
    learnRule?: boolean;
  };

  const ids = body.transactionIds?.filter((id) => Number.isFinite(id)) ?? [];
  const accountId = body.accountId;
  if (!ids.length || !accountId) {
    return NextResponse.json({ error: "transactionIds and accountId required" }, { status: 400 });
  }

  const updated = await categorizeTransactions({
    transactionIds: ids,
    accountId,
    importance: body.importance ?? null,
    learnRule: body.learnRule !== false,
  });

  return NextResponse.json({ ok: true, updated });
}
