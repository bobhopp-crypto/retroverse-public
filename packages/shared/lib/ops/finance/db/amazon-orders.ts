import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";
import type { ParsedAmazonOrder } from "@/lib/ops/finance/parsers/amazon-pdf";
import type { FinanceAmazonImportReport } from "@/lib/ops/finance/finance-canonical-model";

export type AmazonOrderSummary = {
  ytdSpend: number;
  lifetimeSpend: number;
  monthlyAvg: number;
  byCategory: { category: string; slug: string; amount: number }[];
  retroverseSpend: number;
  printing3dSpend: number;
  topItems: { description: string; amount: number; count: number }[];
};

export async function insertAmazonOrders(
  orders: ParsedAmazonOrder[],
  importId: number,
): Promise<FinanceAmazonImportReport> {
  let ordersImported = 0;
  let itemsImported = 0;
  let duplicatesSkipped = 0;
  const spendMap = new Map<string, number>();

  for (const order of orders) {
    try {
      const orderRows = await inspectQuery<{ id: number }>(
        `INSERT INTO finance_amazon_orders (order_number, order_date, order_total, delivery_status, raw_import_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (order_number) DO UPDATE SET
           order_total = EXCLUDED.order_total,
           delivery_status = COALESCE(EXCLUDED.delivery_status, finance_amazon_orders.delivery_status),
           updated_at = now()
         RETURNING id`,
        [order.orderNumber, order.orderDate, order.orderTotal, order.deliveryStatus, importId],
      );
      const orderId = orderRows[0]?.id;
      if (!orderId) continue;
      ordersImported++;

      for (const item of order.items) {
        const result = await inspectExecute(
          `INSERT INTO finance_amazon_order_items
             (order_id, description, amount, category_slug, importance, delivery_status, dedupe_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (dedupe_key) DO NOTHING`,
          [
            orderId,
            item.description,
            item.amount,
            item.categorySlug,
            item.importance,
            item.deliveryStatus,
            item.dedupeKey,
          ],
        );
        if (result > 0) {
          itemsImported++;
          const amt = item.amount ?? 0;
          spendMap.set(item.categorySlug, (spendMap.get(item.categorySlug) ?? 0) + amt);
        } else {
          duplicatesSkipped++;
        }
      }
    } catch (err) {
      financeDbError(err);
    }
  }

  const spendByCategory = [...spendMap.entries()]
    .map(([slug, amount]) => ({
      category: slug.replace(/-/g, " "),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    ordersImported,
    itemsImported,
    duplicatesSkipped,
    spendByCategory,
    totalSpend: spendByCategory.reduce((s, c) => s + c.amount, 0),
  };
}

export async function queryAmazonSummary(year?: number): Promise<AmazonOrderSummary> {
  const y = year ?? new Date().getFullYear();
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;

  try {
    const [ytdRows, lifeRows, catRows, topRows] = await Promise.all([
      inspectQuery<{ total: string }>(
        `SELECT COALESCE(SUM(COALESCE(i.amount, o.order_total)), 0)::text AS total
         FROM finance_amazon_orders o
         LEFT JOIN finance_amazon_order_items i ON i.order_id = o.id
         WHERE o.order_date >= $1 AND o.order_date <= $2`,
        [yearStart, yearEnd],
      ),
      inspectQuery<{ total: string; months: string }>(
        `SELECT COALESCE(SUM(COALESCE(i.amount, o.order_total)), 0)::text AS total,
                GREATEST(COUNT(DISTINCT date_trunc('month', o.order_date)), 1)::text AS months
         FROM finance_amazon_orders o
         LEFT JOIN finance_amazon_order_items i ON i.order_id = o.id`,
      ),
      inspectQuery<{ slug: string; amount: string }>(
        `SELECT COALESCE(i.category_slug, 'shopping') AS slug,
                SUM(COALESCE(i.amount, 0))::text AS amount
         FROM finance_amazon_order_items i
         JOIN finance_amazon_orders o ON o.id = i.order_id
         WHERE o.order_date >= $1 AND o.order_date <= $2
         GROUP BY i.category_slug
         ORDER BY SUM(COALESCE(i.amount, 0)) DESC`,
        [yearStart, yearEnd],
      ),
      inspectQuery<{ description: string; amount: string; count: string }>(
        `SELECT i.description, SUM(COALESCE(i.amount, 0))::text AS amount, COUNT(*)::text AS count
         FROM finance_amazon_order_items i
         JOIN finance_amazon_orders o ON o.id = i.order_id
         WHERE o.order_date >= $1 AND o.order_date <= $2
         GROUP BY i.description
         ORDER BY SUM(COALESCE(i.amount, 0)) DESC
         LIMIT 8`,
        [yearStart, yearEnd],
      ),
    ]);

    const ytdSpend = Number(ytdRows[0]?.total ?? 0);
    const lifetimeSpend = Number(lifeRows[0]?.total ?? 0);
    const months = Number(lifeRows[0]?.months ?? 1);

    return {
      ytdSpend,
      lifetimeSpend,
      monthlyAvg: lifetimeSpend / months,
      byCategory: catRows.map((r) => ({
        slug: r.slug,
        category: r.slug.replace(/-/g, " "),
        amount: Number(r.amount),
      })),
      retroverseSpend: Number(catRows.find((r) => r.slug === "retroverse")?.amount ?? 0),
      printing3dSpend: Number(catRows.find((r) => r.slug === "retro-3d-printing")?.amount ?? 0),
      topItems: topRows.map((r) => ({
        description: r.description,
        amount: Number(r.amount),
        count: Number(r.count),
      })),
    };
  } catch (err) {
    financeDbError(err);
  }
}
