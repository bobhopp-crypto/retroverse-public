#!/usr/bin/env npx tsx
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectPing, inspectQuery } from "../../lib/inspect/pg";
import {
  classifyNebatDescription,
  parseNebatPdf,
} from "../../lib/ops/finance/parsers/nebat-pdf";

const IMPORT_ID = 33;

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) process.exit(1);

  const imp = await inspectQuery<Record<string, unknown>>(
    `SELECT storage_path, workflow_status, transaction_count, posted_transaction_count,
            statement_start::text, statement_end::text, transactions_inserted, transactions_skipped
     FROM finance_imports WHERE id = $1`,
    [IMPORT_ID],
  );
  console.log("=== IMPORT 33 ===\n", JSON.stringify(imp[0], null, 2));

  const path = String(imp[0]?.storage_path ?? "");
  const fullPath = path.startsWith("/") ? path : join(process.cwd(), path);
  const parsed = await parseNebatPdf(await readFile(fullPath));
  if (parsed.kind !== "checking") throw new Error("not checking");

  const activeOnImport = await inspectQuery<{
    id: number;
    transaction_date: string;
    description: string;
    amount: string;
    dedupe_key: string;
  }>(
    `SELECT id, transaction_date::text, description, amount::text, dedupe_key
     FROM finance_transactions WHERE raw_import_id = $1 AND archived_at IS NULL`,
    [IMPORT_ID],
  );
  const activeKeys = new Set(activeOnImport.map((t) => t.dedupe_key));

  console.log("\n=== ALL 10 SOURCE ROWS ===");
  const missing = [];
  for (const t of parsed.transactions) {
    const classified = classifyNebatDescription(t.description);
    const onLedger = activeOnImport.find((l) => l.dedupe_key === t.dedupeKey);
    const row = {
      date: t.transactionDate,
      description: t.description,
      amount: t.amount,
      flowKind: t.flowKind,
      proposedAccount: classified.accountName,
      dedupeKey: t.dedupeKey,
      status: onLedger ? `posted id=${onLedger.id}` : "MISSING",
    };
    console.log(row);
    if (!onLedger) missing.push({ ...t, classified });
  }

  console.log("\n=== WHY MISSING (dedupe / archive / other) ===");
  for (const t of missing) {
    const hits = await inspectQuery<Record<string, unknown>>(
      `SELECT id, transaction_date::text, description, amount::text, raw_import_id,
              archived_at::text, dedupe_key
       FROM finance_transactions WHERE dedupe_key = $1`,
      [t.dedupeKey],
    );
    console.log(`\n${t.description} $${t.amount}`);
    console.log("  dedupe_key:", t.dedupeKey);
    if (!hits.length) {
      console.log("  reason: NEVER INSERTED (no row with this dedupe_key anywhere)");
    } else {
      for (const h of hits) {
        const reason = h.archived_at
          ? "exists ARCHIVED — insertFinanceTransactions skips archived, blocks re-insert with same key"
          : h.raw_import_id !== String(IMPORT_ID)
            ? `exists ACTIVE on import ${h.raw_import_id} — dedupe skip`
            : "exists on import 33 but not active?";
        console.log("  hit:", h, reason);
      }
    }
  }

  console.log("\n=== IMPORT 33 insert/skip stats ===");
  console.log("transactions_inserted:", imp[0]?.transactions_inserted);
  console.log("transactions_skipped:", imp[0]?.transactions_skipped);
  console.log("posted_transaction_count:", imp[0]?.posted_transaction_count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
