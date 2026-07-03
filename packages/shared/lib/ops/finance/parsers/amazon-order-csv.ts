import { parseCsvRows } from "@/lib/cover-integrity/parse-csv";

import { categorizeAmazonItem } from "@/lib/ops/finance/parsers/amazon-pdf";
import type { ParsedAmazonOrder } from "@/lib/ops/finance/parsers/amazon-pdf";

function headerIndex(header: string[], ...names: string[]): number {
  const lower = header.map((h) => h.toLowerCase().trim());
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseDate(value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  const iso = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1]!.padStart(2, "0")}-${mdy[2]!.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseMoney(value: string): number | null {
  const n = Number(String(value).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? Math.abs(n) : null;
}

/** Amazon Account → Order History Report (bulk CSV, years of orders). */
export function parseAmazonOrderHistoryCsv(content: string): ParsedAmazonOrder[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];

  const header = rows[0]!;
  const orderIdIdx = headerIndex(header, "Order ID", "Order #", "Amazon Order Id", "Order Number");
  const dateIdx = headerIndex(header, "Order Date", "Purchase Date", "Shipment Date");
  const titleIdx = headerIndex(header, "Title", "Product Name", "Item Name", "Product Title");
  const itemAmtIdx = headerIndex(
    header,
    "Item Total",
    "Item ($)",
    "Shipment Item Subtotal",
    "Item subtotal",
    "Unit Price",
  );
  const orderTotalIdx = headerIndex(header, "Order Total", "Total Owed", "Shipment Item Subtotal");

  if (orderIdIdx < 0 || dateIdx < 0) return [];

  const byOrder = new Map<string, ParsedAmazonOrder>();

  for (const row of rows.slice(1)) {
    const orderNumber = (row[orderIdIdx] ?? "").trim().replace(/^#/, "");
    if (!orderNumber) continue;

    const orderDate = parseDate(row[dateIdx] ?? "");
    if (!orderDate) continue;

    const title = (titleIdx >= 0 ? row[titleIdx] : "")?.trim() || `Amazon order ${orderNumber}`;
    const amount = itemAmtIdx >= 0 ? parseMoney(row[itemAmtIdx] ?? "") : null;
    const orderTotalFromRow = orderTotalIdx >= 0 ? parseMoney(row[orderTotalIdx] ?? "") : null;

    const { accountName, importance } = categorizeAmazonItem(title);
    const item = {
      description: title.slice(0, 500),
      amount,
      deliveryStatus: null,
      categorySlug: accountName,
      importance,
      dedupeKey: `amazon-csv:${orderNumber}:${title.toLowerCase().slice(0, 80)}`,
    };

    const existing = byOrder.get(orderNumber);
    if (existing) {
      existing.items.push(item);
      if (orderTotalFromRow && orderTotalFromRow > existing.orderTotal) {
        existing.orderTotal = orderTotalFromRow;
      }
    } else {
      byOrder.set(orderNumber, {
        orderNumber,
        orderDate,
        orderTotal: orderTotalFromRow ?? amount ?? 0,
        deliveryStatus: null,
        items: [item],
      });
    }
  }

  for (const order of byOrder.values()) {
    if (!order.orderTotal) {
      order.orderTotal = order.items.reduce((s, it) => s + (it.amount ?? 0), 0);
    }
  }

  return [...byOrder.values()].sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

export function isAmazonOrderHistoryCsv(content: string): boolean {
  const head = content.slice(0, 4000).toLowerCase();
  const hasOrderId = head.includes("order id") || head.includes("order #");
  const hasDate = head.includes("order date") || head.includes("purchase date");
  const hasTitle = head.includes("title") || head.includes("product name");
  return hasOrderId && hasDate && hasTitle;
}
