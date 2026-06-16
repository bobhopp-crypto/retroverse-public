import { NextResponse } from "next/server";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { listMerchantSummaries, upsertMerchantProfile } from "@/lib/ops/finance/db/merchants";
import { categorizeTransactions } from "@/lib/ops/finance/db/transactions";
import { inspectQuery } from "@/lib/inspect/pg";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const url = new URL(request.url);
  const pendingOnly = url.searchParams.get("pending") === "1";
  const merchants = await listMerchantSummaries({ pendingOnly, limit: 300 });
  return NextResponse.json({ merchants });
}

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const body = (await request.json()) as {
    merchantKey?: string;
    merchant?: string;
    accountId?: number;
    importance?: string;
    mixed?: boolean;
    applyScope?: "existing" | "future" | "both";
    learnRule?: boolean;
  };

  if (!body.merchantKey || !body.merchant || !body.accountId) {
    return NextResponse.json({ error: "merchantKey, merchant, accountId required" }, { status: 400 });
  }

  const scope = body.applyScope ?? "both";

  if (scope === "existing" || scope === "both") {
    const rows = await inspectQuery<{ id: number }>(
      `SELECT id FROM finance_transactions
       WHERE lower(regexp_replace(trim(merchant), '[^a-zA-Z0-9]+', ' ', 'g')) = $1
         AND account_id IS NULL AND review_status = 'pending'`,
      [body.merchantKey.toLowerCase()],
    );
    if (rows.length) {
      await categorizeTransactions({
        transactionIds: rows.map((r) => Number(r.id)),
        accountId: body.accountId,
        importance: body.importance ?? null,
        learnRule: false,
      });
    }
  }

  if (body.learnRule !== false && (scope === "future" || scope === "both")) {
    const { upsertFinanceRule } = await import("@/lib/ops/finance/db/rules");
    await upsertFinanceRule({
      merchant: body.merchant,
      accountId: body.accountId,
      importance: body.importance ?? null,
    });
  }

  await upsertMerchantProfile({
    merchantKey: body.merchantKey,
    displayName: body.merchant,
    mixed: body.mixed ?? false,
    suggestedAccountId: body.accountId,
    suggestedImportance: body.importance ?? null,
  });

  return NextResponse.json({ ok: true });
}
