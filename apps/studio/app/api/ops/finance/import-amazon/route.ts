import { NextResponse } from "next/server";

import { processAmazonUpload } from "@/lib/ops/finance/import-amazon-service";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results = [];
    let report = {
      ordersImported: 0,
      itemsImported: 0,
      duplicatesSkipped: 0,
      spendByCategory: [] as { category: string; amount: number }[],
      totalSpend: 0,
    };

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await processAmazonUpload({ fileName: file.name, buffer });
      results.push(result);
      report = {
        ordersImported: report.ordersImported + result.report.ordersImported,
        itemsImported: report.itemsImported + result.report.itemsImported,
        duplicatesSkipped: report.duplicatesSkipped + result.report.duplicatesSkipped,
        totalSpend: report.totalSpend + result.report.totalSpend,
        spendByCategory: mergeCategories(report.spendByCategory, result.report.spendByCategory),
      };
    }

    return NextResponse.json({ ok: true, results, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[import-amazon]", err);
    return NextResponse.json(
      {
        error: message,
        detail: message,
        stack: process.env.NODE_ENV === "development" ? stack : undefined,
      },
      { status: 500 },
    );
  }
}

function mergeCategories(
  a: { category: string; amount: number }[],
  b: { category: string; amount: number }[],
) {
  const map = new Map<string, number>();
  for (const row of [...a, ...b]) {
    map.set(row.category, (map.get(row.category) ?? 0) + row.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((x, y) => y.amount - x.amount);
}
