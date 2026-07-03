import type { FinanceImportance } from "@/lib/ops/finance/finance-importance";

export type ParsedAmazonOrder = {
  orderNumber: string;
  orderDate: string;
  orderTotal: number;
  deliveryStatus: string | null;
  items: {
    description: string;
    amount: number | null;
    deliveryStatus: string | null;
    categorySlug: string;
    importance: FinanceImportance;
    dedupeKey: string;
  }[];
};

const RETROVERSE_KEYWORDS = [
  "cardstock",
  "photo paper",
  "epson ink",
  "epson",
  "ink cartridge",
  "vip pass",
  "numbering machine",
  "usb drive",
  "bingo",
];

const PRINTING_3D_KEYWORDS = [
  "bearing",
  "magnet",
  "starbond",
  "caliper",
  "deburr",
  "3d print",
  "pla ",
  "petg",
];

const HEALTH_KEYWORDS = ["tums", "omeprazole", "nizoral", "cortizone", "cortisone"];

const HOME_KEYWORDS = [
  "curtain",
  "chair mat",
  "office chair",
  "smart plug",
  "desk mat",
];

export function categorizeAmazonItem(description: string): {
  accountName: string;
  importance: FinanceImportance;
} {
  const text = description.toLowerCase();

  if (RETROVERSE_KEYWORDS.some((k) => text.includes(k))) {
    return { accountName: "Inventory", importance: "useful" };
  }
  if (PRINTING_3D_KEYWORDS.some((k) => text.includes(k))) {
    return { accountName: "3D Printing", importance: "optional" };
  }
  if (HEALTH_KEYWORDS.some((k) => text.includes(k))) {
    return { accountName: "Medical", importance: "required" };
  }
  if (HOME_KEYWORDS.some((k) => text.includes(k))) {
    return { accountName: "Home", importance: "required" };
  }
  return { accountName: "Shopping", importance: "luxury" };
}

function parseAmazonDate(raw: string): string | null {
  const d = new Date(raw.trim());
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const mdy = raw.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
  if (mdy) {
    const parsed = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const ORDER_HISTORY_ACTION =
  /^(Buy it again|Track package|View or edit order|View your Subscribe|Write a product review|Return or replace|Share gift receipt|Leave seller feedback|Ask Product Question|View order details|View invoice|Auto-delivered|Submit|Search Orders)/i;
const ORDER_HISTORY_DELIVERY = /^(Arriving|Delivered|Out for delivery|Pending|Not yet shipped)/i;

function extractOrderHistoryPdfItems(chunk: string): { description: string; amount: number | null }[] {
  const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: { description: string; amount: number | null }[] = [];
  let collecting = false;
  let current: string[] = [];

  const flush = () => {
    const description = current.join(" ").replace(/\s+/g, " ").trim();
    if (description.length >= 8 && !/^(SHIP TO|ORDER|TOTAL|Bob Hopp)/i.test(description)) {
      items.push({ description, amount: null });
    }
    current = [];
  };

  for (const line of lines) {
    if (ORDER_HISTORY_DELIVERY.test(line)) {
      flush();
      collecting = true;
      continue;
    }
    if (!collecting) continue;
    if (ORDER_HISTORY_ACTION.test(line)) {
      flush();
      collecting = false;
      continue;
    }
    if (/^(ORDER\s*#|SHIP TO|TOTAL|View |https?:\/\/)/i.test(line)) continue;
    if (/^(Your package was|The carrier|Package was)/i.test(line)) continue;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) continue;
    if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/i.test(line)) {
      continue;
    }
    current.push(line);
  }
  flush();
  return items;
}

/** Parse Amazon order-history PDF text (from pdf-parse). */
export function parseAmazonOrderPdfText(text: string): ParsedAmazonOrder[] {
  const orders: ParsedAmazonOrder[] = [];
  const chunks = text.split(/(?=Order\s+Placed|ORDER\s+PLACED)/i).filter((c) => c.trim());

  for (const chunk of chunks) {
    const orderNumber =
      chunk.match(/Order\s*#\s*([\d-]+)/i)?.[1] ??
      chunk.match(/(\d{3}-\d{7}-\d{7})/)?.[1] ??
      null;
    if (!orderNumber) continue;

    const dateRaw =
      chunk.match(/Order\s+Placed:?\s*([^\n]+)/i)?.[1] ??
      chunk.match(/Order\s+Placed\s*\n\s*([^\n]+)/i)?.[1] ??
      chunk.match(/Ordered on\s*([^\n]+)/i)?.[1] ??
      "";
    const orderDate = parseAmazonDate(dateRaw);
    if (!orderDate) continue;

    const total =
      parseMoney(
        chunk.match(/(?:Order\s+Total|Grand\s+Total|TOTAL)\s*:?\s*\n?\s*\$?([\d,.]+)/i)?.[1] ?? "",
      ) ??
      parseMoney(chunk.match(/\$\s*([\d,.]+)\s*$/m)?.[1] ?? "") ??
      0;

    const deliveryStatus =
      chunk.match(/\b(Shipped|Delivered|Out for delivery|Arriving|Pending)\b/i)?.[1] ?? null;

    const historyItems = extractOrderHistoryPdfItems(chunk);
    const items: ParsedAmazonOrder["items"] = [];

    if (historyItems.length) {
      const perItem =
        historyItems.length === 1 ? total : total > 0 ? total / historyItems.length : null;
      for (const row of historyItems) {
        const { accountName, importance } = categorizeAmazonItem(row.description);
        items.push({
          description: row.description.slice(0, 500),
          amount: row.amount ?? perItem,
          deliveryStatus,
          categorySlug: accountName,
          importance,
          dedupeKey: `amazon-pdf:${orderNumber}:${row.description.toLowerCase().slice(0, 80)}`,
        });
      }
    } else {
      const statusWords =
        /^(shipped|delivered|out for delivery|pending|subtotal|shipping|tax|grand total|order total)$/i;
      const itemLines = chunk.split("\n");
      for (let i = 0; i < itemLines.length; i++) {
        const line = itemLines[i]!.trim();
        if (line.length < 4) continue;
        if (/^(Order|Subtotal|Shipping|Tax|Total|Grand|Payment|Sold by)/i.test(line)) continue;
        if (statusWords.test(line)) continue;
        const priceMatch = line.match(/\$\s*([\d,.]+)\s*$/);
        const inlinePrice = priceMatch ? parseMoney(priceMatch[1]!) : null;
        const desc = priceMatch ? line.replace(/\$\s*[\d,.]+\s*$/, "").trim() : line;
        if (desc.length < 5 || /^\$/.test(desc)) continue;
        if (/^(Qty|Quantity|Condition):/i.test(desc)) continue;

        const nextPrice =
          !inlinePrice && itemLines[i + 1]
            ? parseMoney(itemLines[i + 1]!.match(/\$\s*([\d,.]+)/)?.[1] ?? "")
            : null;
        const amount = inlinePrice ?? nextPrice;
        if (!amount && desc.split(" ").length < 2) continue;

        const { accountName, importance } = categorizeAmazonItem(desc);
        items.push({
          description: desc.slice(0, 500),
          amount,
          deliveryStatus,
          categorySlug: accountName,
          importance,
          dedupeKey: `amazon-pdf:${orderNumber}:${desc.toLowerCase().slice(0, 80)}`,
        });
      }
    }

    if (!items.length && total > 0) {
      items.push({
        description: `Amazon order ${orderNumber}`,
        amount: total,
        deliveryStatus,
        categorySlug: "Shopping",
        importance: "luxury",
        dedupeKey: `amazon-pdf:${orderNumber}:order-total`,
      });
    }

    orders.push({
      orderNumber,
      orderDate,
      orderTotal: total || items.reduce((s, it) => s + (it.amount ?? 0), 0),
      deliveryStatus,
      items,
    });
  }

  return orders;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Import the parser implementation directly — pdf-parse/index.js runs debug self-test when module.parent is falsy.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    buf: Buffer,
  ) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text ?? "";
}

export async function parseAmazonOrderPdf(buffer: Buffer): Promise<ParsedAmazonOrder[]> {
  const text = await extractTextFromPdf(buffer);
  return parseAmazonOrderPdfText(text);
}
