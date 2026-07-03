import { NextResponse } from "next/server";

import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { queryLedger, updateLedgerTransactions, deleteLedgerTransactions } from "@/lib/ops/finance/db/transactions";
import { categorizeTransactions } from "@/lib/ops/finance/db/transactions";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const url = new URL(request.url);
  const transactions = await queryLedger({
    year: url.searchParams.get("year") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    accountId: url.searchParams.get("accountId")
      ? Number(url.searchParams.get("accountId"))
      : undefined,
    merchant: url.searchParams.get("merchant") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    sort: (url.searchParams.get("sort") as "date" | "merchant" | "amount" | "account") ?? "date",
    sortDir: (url.searchParams.get("sortDir") as "asc" | "desc") ?? "desc",
    limit: Number(url.searchParams.get("limit") ?? 500),
  });
  const accounts = await listFinanceAccounts();

  return NextResponse.json({ transactions, accounts });
}

export async function PATCH(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const body = (await request.json()) as {
    transactionIds?: number[];
    accountId?: number;
    importance?: string;
    taxTreatment?: string;
    notes?: string;
    flowKind?: string;
    learnRule?: boolean;
  };

  const ids = body.transactionIds?.filter((id) => Number.isFinite(id)) ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: "transactionIds required" }, { status: 400 });
  }

  if (body.accountId && body.learnRule) {
    await categorizeTransactions({
      transactionIds: ids,
      accountId: body.accountId,
      importance: body.importance ?? null,
      learnRule: true,
    });
  } else {
    await updateLedgerTransactions(ids, {
      accountId: body.accountId,
      importance: body.importance,
      taxTreatment: body.taxTreatment,
      notes: body.notes,
      flowKind: body.flowKind,
    });
  }

  return NextResponse.json({ ok: true, updated: ids.length });
}

export async function DELETE(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const body = (await request.json()) as { transactionIds?: number[] };
  const ids = body.transactionIds?.filter((id) => Number.isFinite(id)) ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: "transactionIds required" }, { status: 400 });
  }

  const deleted = await deleteLedgerTransactions(ids);
  return NextResponse.json({ ok: true, deleted });
}
