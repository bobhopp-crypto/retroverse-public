#!/usr/bin/env npx tsx
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectPing, inspectQuery } from "../../lib/inspect/pg";
import { parseNebatPdf } from "../../lib/ops/finance/parsers/nebat-pdf";

async function main() {
  if (!(await inspectPing()).ok) process.exit(1);
  const imp = await inspectQuery<{ storage_path: string }>(
    `SELECT storage_path FROM finance_imports WHERE id = 33`,
  );
  const path = imp[0]!.storage_path!;
  const full = path.startsWith("/") ? path : join(process.cwd(), path);
  const parsed = await parseNebatPdf(await readFile(full));
  if (parsed.kind !== "checking") return;

  const stmt = await inspectQuery<{ total_additions: string; total_subtractions: string }>(
    `SELECT total_additions::text, total_subtractions::text FROM finance_nebat_statements WHERE raw_import_id = 33`,
  );

  let add = 0, sub = 0;
  for (const t of parsed.transactions) {
    if (t.flowKind === "income") add += t.amount;
    else sub += t.amount;
  }

  const ledger = await inspectQuery<{ flow_kind: string; amount: string }>(
    `SELECT flow_kind, amount::text FROM finance_transactions WHERE raw_import_id = 33 AND archived_at IS NULL`,
  );
  let ladd = 0, lsub = 0;
  for (const t of ledger) {
    if (t.flow_kind === "income") ladd += Number(t.amount);
    else lsub += Number(t.amount);
  }

  const begin = 2432.83;
  const end = 3693.12;
  console.log("Statement header additions:", stmt[0]?.total_additions);
  console.log("Statement header subtractions:", stmt[0]?.total_subtractions);
  console.log("Header calc end:", begin + Number(stmt[0]?.total_additions) - Number(stmt[0]?.total_subtractions));
  console.log("Parsed 10 additions:", add, "sub:", sub, "calc:", begin + add - sub);
  console.log("Ledger 6 additions:", ladd, "sub:", lsub, "calc:", begin + ladd - lsub);
  console.log("Ledger 10 (projected) additions:", ladd + (add - ladd), "sub:", lsub + (sub - lsub));
  console.log("Gap additions header vs parsed:", Number(stmt[0]?.total_additions) - add);
}

main();
