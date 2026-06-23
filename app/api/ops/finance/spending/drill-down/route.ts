import { NextResponse } from "next/server";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  loadSpendingDrillDown,
  loadSpendingSeriesRefresh,
} from "@/lib/ops/finance/load-spending-drill-down";
import {
  assignSpendingCategoryToTransaction,
  type SpendingEditCategoryId,
} from "@/lib/ops/finance/spending-category-edit";
import { isSpendingHomeCategoryId } from "@/lib/ops/finance/spending-home-categories";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId") ?? "";
  const month = url.searchParams.get("month") ?? "";
  const merchant = url.searchParams.get("merchant");

  if (!isSpendingHomeCategoryId(categoryId) || !month) {
    return NextResponse.json({ error: "categoryId and month required" }, { status: 400 });
  }

  const drillDown = await loadSpendingDrillDown({
    categoryId,
    month,
    merchant: merchant || null,
  });

  if (!drillDown) {
    return NextResponse.json({ error: "Invalid month label" }, { status: 400 });
  }

  return NextResponse.json({ drillDown });
}

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const body = (await request.json()) as {
    transactionId?: number;
    categoryId?: SpendingEditCategoryId;
    chartCategoryId?: string;
    month?: string;
    merchant?: string | null;
  };

  const transactionId = body.transactionId;
  const categoryId = body.categoryId;
  const chartCategoryId = body.chartCategoryId;
  const month = body.month;

  if (!transactionId || !categoryId) {
    return NextResponse.json({ error: "transactionId and categoryId required" }, { status: 400 });
  }

  await assignSpendingCategoryToTransaction(transactionId, categoryId);

  if (!chartCategoryId || !month || !isSpendingHomeCategoryId(chartCategoryId)) {
    return NextResponse.json({ ok: true });
  }

  const [drillDown, series] = await Promise.all([
    loadSpendingDrillDown({
      categoryId: chartCategoryId,
      month,
      merchant: body.merchant ?? null,
    }),
    loadSpendingSeriesRefresh(chartCategoryId),
  ]);

  return NextResponse.json({ ok: true, drillDown, series });
}
