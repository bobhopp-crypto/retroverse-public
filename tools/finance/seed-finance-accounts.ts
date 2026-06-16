/**
 * Seed finance_accounts from workbook APPLE column E.
 * Usage: RETROVERSE_OPS=1 npx tsx tools/finance/seed-finance-accounts.ts
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  seedFinanceMerchantRules,
  upsertWorkbookAccounts,
} from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { inspectPing } from "@/lib/inspect/pg";

const execFileAsync = promisify(execFile);

type ExtractPayload = {
  accounts: {
    name: string;
    slug: string;
    workbookTxnCount: number;
    active: boolean;
  }[];
  total: number;
};

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres unavailable");
    process.exit(1);
  }

  await ensureFinanceSchema();

  const workbook =
    process.env.FINANCE_WORKBOOK_PATH?.trim() ||
    "/Users/bobhopp/FINANCIAL/2021-2026 Financial Workbook.xlsx";

  const { stdout } = await execFileAsync("python3", [
    "tools/finance/extract-workbook-accounts.py",
    workbook,
  ]);

  const payload = JSON.parse(stdout) as ExtractPayload;
  const upserted = await upsertWorkbookAccounts(
    payload.accounts.map((a) => ({
      name: a.name,
      slug: a.slug,
      workbookTxnCount: a.workbookTxnCount,
      active: a.active,
    })),
  );

  await seedFinanceMerchantRules();

  console.log(`Seeded ${upserted} workbook accounts (${payload.total} unique categories)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
