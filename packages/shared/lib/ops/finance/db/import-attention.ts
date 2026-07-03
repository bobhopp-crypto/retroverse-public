import { inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import { countReviewQueue } from "@/lib/ops/finance/db/transactions";
import { activeBookkeepingFilters } from "@/lib/ops/finance/finance-filters";

export async function countImportsNeedingAttention(): Promise<number> {
  try {
    const rows = await inspectQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM finance_imports
       WHERE posted_at IS NULL
         AND workflow_status IN ('uploaded', 'parsed', 'reviewed', 'reconciled')
         AND source NOT IN ('amazon')`,
    );
    const pendingImports = Number(rows[0]?.count ?? 0);
    const reviewQueue = await countReviewQueue(activeBookkeepingFilters());
    return pendingImports + reviewQueue;
  } catch (err) {
    financeDbError(err);
  }
}
