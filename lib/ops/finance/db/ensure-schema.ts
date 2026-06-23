import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectExecute, inspectPing, inspectQuery } from "@/lib/inspect/pg";

const MIGRATION_PATH = join(process.cwd(), "docs/migrations/finance.sql");
const PHASE2_PATH = join(process.cwd(), "docs/migrations/finance-phase2.sql");
const PHASE3_PATH = join(process.cwd(), "docs/migrations/finance-phase3.sql");
const PHASE4_PATH = join(process.cwd(), "docs/migrations/finance-phase4.sql");
const PHASE5_PATH = join(process.cwd(), "docs/migrations/finance-phase5.sql");
const PHASE6_PATH = join(process.cwd(), "docs/migrations/finance-phase6-trust-reset.sql");
const PHASE7_PATH = join(process.cwd(), "docs/migrations/finance-phase7-account-setup.sql");
const PHASE8_PATH = join(process.cwd(), "docs/migrations/finance-phase8-statement-integrity.sql");
const PHASE9_PATH = join(process.cwd(), "docs/migrations/finance-phase9-jan-2026-repair.sql");
const PHASE10_PATH = join(process.cwd(), "docs/migrations/finance-phase10-apple-card-statements.sql");

export async function ensureFinanceSchema(): Promise<boolean> {
  const ping = await inspectPing();
  if (!ping.ok) return false;

  const check = await inspectQuery<{ reg: string | null }>(
    `SELECT to_regclass('public.finance_transactions') AS reg`,
  );
  if (!check[0]?.reg) {
    const sql = await readFile(MIGRATION_PATH, "utf8");
    await inspectExecute(sql);
  }

  try {
    const phase2 = await readFile(PHASE2_PATH, "utf8");
    await inspectExecute(phase2);
  } catch {
    // Phase 2 migration optional until file exists on disk.
  }

  try {
    const phase3 = await readFile(PHASE3_PATH, "utf8");
    await inspectExecute(phase3);
  } catch {
    // Phase 3 migration optional until file exists on disk.
  }

  try {
    const phase4 = await readFile(PHASE4_PATH, "utf8");
    await inspectExecute(phase4);
  } catch {
    // Phase 4 migration optional until file exists on disk.
  }

  try {
    const phase5 = await readFile(PHASE5_PATH, "utf8");
    await inspectExecute(phase5);
  } catch {
    // Phase 5 migration optional until file exists on disk.
  }

  try {
    const phase6 = await readFile(PHASE6_PATH, "utf8");
    await inspectExecute(phase6);
  } catch {
    // Phase 6 migration optional until file exists on disk.
  }

  try {
    const phase7 = await readFile(PHASE7_PATH, "utf8");
    await inspectExecute(phase7);
  } catch {
    // Phase 7 migration optional until file exists on disk.
  }

  try {
    const phase8 = await readFile(PHASE8_PATH, "utf8");
    await inspectExecute(phase8);
  } catch {
    // Phase 8 migration optional until file exists on disk.
  }

  try {
    const phase9 = await readFile(PHASE9_PATH, "utf8");
    await inspectExecute(phase9);
  } catch {
    // Phase 9 migration optional until file exists on disk.
  }

  try {
    const phase10 = await readFile(PHASE10_PATH, "utf8");
    await inspectExecute(phase10);
  } catch {
    // Phase 10 migration optional until file exists on disk.
  }

  await seedAccountsIfEmpty();

  return true;
}

async function seedAccountsIfEmpty(): Promise<void> {
  try {
    const rows = await inspectQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM finance_accounts`,
    );
    if (Number(rows[0]?.count ?? 0) > 0) return;
  } catch {
    return;
  }

  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const workbook =
      process.env.FINANCE_WORKBOOK_PATH?.trim() ||
      "/Users/bobhopp/FINANCIAL/2021-2026 Financial Workbook.xlsx";
    const { stdout } = await execFileAsync("python3", [
      "tools/finance/extract-workbook-accounts.py",
      workbook,
    ]);
    const payload = JSON.parse(stdout) as {
      accounts: { name: string; slug: string; workbookTxnCount: number; active: boolean }[];
    };
    const { upsertWorkbookAccounts, seedFinanceMerchantRules } = await import(
      "@/lib/ops/finance/db/accounts"
    );
    await upsertWorkbookAccounts(payload.accounts);
    await seedFinanceMerchantRules();
  } catch {
    // Workbook or python unavailable — seed manually via tools/finance/seed-finance-accounts.ts
  }
}

export function financeDbError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("finance_")) {
    throw new Error(
      "Finance tables missing — run docs/migrations/finance.sql on Postgres",
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}
