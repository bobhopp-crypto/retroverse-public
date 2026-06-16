/**
 * Finance data corrections + active-work metrics.
 * Run: npx tsx tools/finance/correct-stale-review-status.ts
 *      npx tsx tools/finance/correct-stale-review-status.ts --subcategory-backfill
 */
import { inspectExecute, inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { queryMerchantWorkloadMetrics } from "@/lib/ops/finance/db/merchants";

async function txnMetrics() {
  const [row] = await inspectQuery<{
    badge_legacy: string;
    badge_new: string;
    stale_pending: string;
    no_account: string;
    no_account_2026: string;
    no_account_pre2026: string;
    pending_no_account: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM finance_transactions t
        WHERE t.flow_kind = 'expense' AND t.amount > 0
          AND t.review_status = 'pending' AND t.category_id IS NULL) AS badge_legacy,
       (SELECT COUNT(*)::text FROM finance_transactions t
        WHERE t.flow_kind = 'expense' AND t.amount > 0
          AND t.account_id IS NULL) AS badge_new,
       (SELECT COUNT(*)::text FROM finance_transactions
        WHERE account_id IS NOT NULL AND review_status = 'pending') AS stale_pending,
       (SELECT COUNT(*)::text FROM finance_transactions
        WHERE account_id IS NULL AND flow_kind = 'expense' AND amount > 0) AS no_account,
       (SELECT COUNT(*)::text FROM finance_transactions
        WHERE account_id IS NULL AND flow_kind = 'expense' AND amount > 0
          AND transaction_date >= '2026-01-01') AS no_account_2026,
       (SELECT COUNT(*)::text FROM finance_transactions
        WHERE account_id IS NULL AND flow_kind = 'expense' AND amount > 0
          AND transaction_date < '2026-01-01') AS no_account_pre2026,
       (SELECT COUNT(*)::text FROM finance_transactions
        WHERE account_id IS NULL AND review_status = 'pending'
          AND flow_kind = 'expense' AND amount > 0) AS pending_no_account`,
  );
  return {
    badgeLegacy: Number(row.badge_legacy),
    badgeNew: Number(row.badge_new),
    stalePending: Number(row.stale_pending),
    noAccount: Number(row.no_account),
    noAccount2026: Number(row.no_account_2026),
    noAccountPre2026: Number(row.no_account_pre2026),
    pendingNoAccount: Number(row.pending_no_account),
  };
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres unavailable:", ping.error);
    process.exit(1);
  }

  const subcategoryBackfill = process.argv.includes("--subcategory-backfill");

  if (subcategoryBackfill) {
    const before = await inspectQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM finance_transactions
       WHERE account_id IS NULL AND subcategory IS NOT NULL AND flow_kind = 'expense' AND amount > 0`,
    );
    console.log("UNASSIGNED_WITH_SUBCATEGORY_BEFORE", before[0]?.n);
    const updated = await inspectExecute(
      `UPDATE finance_transactions t
       SET account_id = a.id, subcategory = a.name, updated_at = now()
       FROM finance_accounts a
       WHERE t.account_id IS NULL AND t.subcategory IS NOT NULL
         AND lower(trim(t.subcategory)) = lower(trim(a.name))
         AND a.merged_into_id IS NULL`,
    );
    console.log(`SUBCATEGORY_BACKFILL_UPDATED ${updated}`);
    const after = await inspectQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM finance_transactions
       WHERE account_id IS NULL AND subcategory IS NOT NULL AND flow_kind = 'expense' AND amount > 0`,
    );
    console.log("UNASSIGNED_WITH_SUBCATEGORY_AFTER", after[0]?.n);
  } else {
    const before = await txnMetrics();
    console.log("BEFORE", JSON.stringify(before, null, 2));

    if (before.stalePending === 0) {
      console.log("No stale pending rows — nothing to update.");
    } else {
      const updated = await inspectExecute(
        `UPDATE finance_transactions
         SET review_status = 'approved', updated_at = now()
         WHERE account_id IS NOT NULL AND review_status = 'pending'`,
      );
      console.log(`UPDATED ${updated} rows`);
      const after = await txnMetrics();
      console.log("AFTER", JSON.stringify(after, null, 2));
    }
  }

  const workload = await queryMerchantWorkloadMetrics();
  console.log("MERCHANT_WORKLOAD", JSON.stringify(workload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
