import { parseCsvRows } from "@/lib/cover-integrity/parse-csv";

import type { FinanceImportSource, ParsedFinanceRow } from "@/lib/ops/finance/finance-model";
import { buildDedupeKey } from "@/lib/ops/finance/finance-model";

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

function parseAmount(value: string): number | null {
  const n = Number(String(value).replace(/[$,]/g, "").trim());
  if (!Number.isFinite(n)) return null;
  return Math.abs(n);
}

const WORKBOOK_CATEGORY_TO_SLUG: Record<string, string> = {
  "AI - ChatGPT": "ai-chatgpt",
  "Software - ChatGPT": "ai-chatgpt",
  "AI - Cursor": "ai-cursor",
  "AI - Grok": "ai-grok",
  "SUB - Grok": "ai-grok",
  "AI - Gemini": "ai-gemini",
  "AI - Creative Fabrica": "ai-creative-fabrica",
  "AI - Kittl": "ai-kittl",
  "Software - KITTL": "ai-kittl",
  "SUB - Kittle": "ai-kittl",
  "AI - Abacus": "ai-abacus",
  "AI - Genspark": "ai-genspark",
  "3D Printing": "retro-3d-printing",
  "Engraving": "retro-printing",
  "Web - Cloudflare": "retro-hosting",
  "Web - Neon.tech": "retro-hosting",
  "Web - Netlify": "retro-hosting",
  Home: "home",
  Grocery: "grocery",
  Restaurants: "restaurants",
  Personal: "personal",
  Amazon: "amazon",
};

export function detectImportSource(fileName: string, content: string): FinanceImportSource {
  const name = fileName.toLowerCase();
  const head = content.slice(0, 2000).toLowerCase();

  if (name.includes("apple") || head.includes("transaction date") && head.includes("amount (usd)")) {
    return "apple_card";
  }
  if (name.includes("amazon") || (head.includes("order date") && head.includes("item total"))) {
    return "amazon";
  }
  if (head.includes("order id") && head.includes("order date") && head.includes("title")) {
    return "amazon";
  }
  if (name.includes("paypal") || head.includes("gross") && head.includes("item title")) {
    return "paypal";
  }
  if (name.includes("nebat") || name.includes("national exchange") || head.includes("withdrawals") && head.includes("deposits")) {
    return "nebat";
  }
  return "unknown";
}

export function parseAppleCardCsv(content: string): ParsedFinanceRow[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];
  const header = rows[0]!;
  const dateIdx = headerIndex(header, "Transaction Date", "Clearing Date");
  const descIdx = headerIndex(header, "Description");
  const merchantIdx = headerIndex(header, "Merchant");
  const catIdx = headerIndex(header, "Category");
  const amtIdx = headerIndex(header, "Amount (USD)", "Amount");
  const typeIdx = headerIndex(header, "Type");

  const out: ParsedFinanceRow[] = [];
  for (const row of rows.slice(1)) {
    const amount = amtIdx >= 0 ? parseAmount(row[amtIdx] ?? "") : null;
    const date = dateIdx >= 0 ? parseDate(row[dateIdx] ?? "") : null;
    if (!amount || !date || amount <= 0) continue;
    const type = typeIdx >= 0 ? (row[typeIdx] ?? "").trim() : "";
    if (type === "Payment" || type === "Credit") continue;

    const merchant = (merchantIdx >= 0 ? row[merchantIdx] : "")?.trim() || "Apple Card";
    const description = (descIdx >= 0 ? row[descIdx] : "")?.trim() || merchant;
    const category = catIdx >= 0 ? (row[catIdx] ?? "").trim() : "";

    out.push({
      transactionDate: date,
      merchant,
      description,
      amount,
      source: "apple_card",
      dedupeKey: buildDedupeKey({ source: "apple_card", transactionDate: date, amount, merchant, description }),
      accountName: category || undefined,
      subcategory: category || undefined,
    });
  }
  return out;
}

export function parseAmazonCsv(content: string): ParsedFinanceRow[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];
  const header = rows[0]!;
  const dateIdx = headerIndex(header, "Order Date", "Purchase Date");
  const acctIdx = headerIndex(header, "Account", "Account Group");
  const titleIdx = headerIndex(header, "Title", "Product Name", "Item Name");
  const orderIdIdx = headerIndex(header, "Order ID", "Order #", "Amazon Order Id");
  const amtIdx = headerIndex(
    header,
    "Item Total",
    "Item ($)",
    "Shipment Item Subtotal",
    "Unit Price",
  );

  const out: ParsedFinanceRow[] = [];
  for (const row of rows.slice(1)) {
    const amount = amtIdx >= 0 ? parseAmount(row[amtIdx] ?? "") : null;
    const date = dateIdx >= 0 ? parseDate(row[dateIdx] ?? "") : null;
    if (!amount || !date) continue;
    const title = (titleIdx >= 0 ? row[titleIdx] : "")?.trim() || "Amazon order";
    const account = (acctIdx >= 0 ? row[acctIdx] : "")?.trim() || "Personal";
    const orderId = orderIdIdx >= 0 ? (row[orderIdIdx] ?? "").trim() : "";

    out.push({
      transactionDate: date,
      merchant: "Amazon",
      description: title,
      amount,
      source: "amazon",
      dedupeKey: buildDedupeKey({
        source: "amazon",
        transactionDate: date,
        amount,
        merchant: "Amazon",
        description: orderId ? `${orderId}:${title}` : title,
      }),
      accountName: account.toLowerCase().includes("inventory") ? "Inventory" : "Amazon",
      subcategory: account,
    });
  }
  return out;
}

export function parsePayPalCsv(content: string): ParsedFinanceRow[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];
  const header = rows[0]!;
  const dateIdx = headerIndex(header, "Date");
  const nameIdx = headerIndex(header, "Name");
  const titleIdx = headerIndex(header, "Item Title", "Item title");
  const grossIdx = headerIndex(header, "Gross");

  const out: ParsedFinanceRow[] = [];
  for (const row of rows.slice(1)) {
    const raw = grossIdx >= 0 ? Number(String(row[grossIdx]).replace(/[$,]/g, "")) : NaN;
    if (!Number.isFinite(raw) || raw >= 0) continue;
    const amount = Math.abs(raw);
    const date = dateIdx >= 0 ? parseDate(row[dateIdx] ?? "") : null;
    if (!date) continue;
    const name = (nameIdx >= 0 ? row[nameIdx] : "")?.trim() || "PayPal";
    const title = (titleIdx >= 0 ? row[titleIdx] : "")?.trim() || name;
    const merchant = name || "PayPal";

    out.push({
      transactionDate: date,
      merchant,
      description: title,
      amount,
      source: "paypal",
      dedupeKey: buildDedupeKey({ source: "paypal", transactionDate: date, amount, merchant, description: title }),
    });
  }
  return out;
}

export function parseNebatCsv(content: string): ParsedFinanceRow[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];
  const header = rows[0]!;
  const dateIdx = headerIndex(header, "Date");
  const acctIdx = headerIndex(header, "Account");
  const descIdx = headerIndex(header, "Description");
  const wIdx = headerIndex(header, "Withdrawals");
  const dIdx = headerIndex(header, "Deposits");

  const out: ParsedFinanceRow[] = [];
  for (const row of rows.slice(1)) {
    const date = dateIdx >= 0 ? parseDate(row[dateIdx] ?? "") : null;
    if (!date) continue;
    const account = (acctIdx >= 0 ? row[acctIdx] : "")?.trim() || "NEBAT";
    const description = (descIdx >= 0 ? row[descIdx] ?? "" : "").trim() || account;
    const withdrawal = wIdx >= 0 ? parseAmount(row[wIdx] ?? "") : null;
    const deposit = dIdx >= 0 ? parseAmount(row[dIdx] ?? "") : null;

    if (deposit && deposit > 0 && !["Apple", "APPLE", "Amazon", "Wells Fargo"].includes(account)) {
      const incomeSlug = inferNebatIncomeSlug(account, description);
      out.push({
        transactionDate: date,
        merchant: account,
        description,
        amount: deposit,
        source: "nebat",
        flowKind: "income",
        categorySlug: incomeSlug,
        subcategory: description,
        dedupeKey: buildDedupeKey({
          source: "nebat",
          transactionDate: date,
          amount: deposit,
          merchant: account,
          description: `${description}:income`,
        }),
      });
    }

    if (!withdrawal || withdrawal <= 0) continue;
    if (["Apple", "APPLE", "Amazon", "Wells Fargo"].includes(account)) continue;

    out.push({
      transactionDate: date,
      merchant: account,
      description,
      amount: withdrawal,
      source: "nebat",
      flowKind: "expense",
      dedupeKey: buildDedupeKey({
        source: "nebat",
        transactionDate: date,
        amount: withdrawal,
        merchant: account,
        description,
      }),
    });
  }
  return out;
}

function inferNebatIncomeSlug(account: string, description: string): string {
  const text = `${account} ${description}`.toLowerCase();
  if (text.includes("social security") || text.includes("ssa")) return "income-social-security";
  if (text.includes("ssm") || text.includes("agnesian")) return "income-ssm-health";
  if (text.includes("funeral")) return "income-funeral-home";
  if (text.includes("dj") || text.includes("gig")) return "income-dj";
  return "income";
}

export function parseFinanceFile(
  fileName: string,
  content: string,
  mimeType: string,
): { source: FinanceImportSource; rows: ParsedFinanceRow[]; note?: string } {
  const source = detectImportSource(fileName, content);
  const isCsv = mimeType.includes("csv") || fileName.toLowerCase().endsWith(".csv");
  const isText = isCsv || mimeType.includes("text/");

  if (!isText && !fileName.toLowerCase().endsWith(".csv")) {
    return {
      source,
      rows: [],
      note: "PDF and image imports are stored for reference. Export CSV for automatic parsing.",
    };
  }

  let rows: ParsedFinanceRow[] = [];
  switch (source) {
    case "apple_card":
      rows = parseAppleCardCsv(content);
      break;
    case "amazon":
      rows = parseAmazonCsv(content);
      break;
    case "paypal":
      rows = parsePayPalCsv(content);
      break;
    case "nebat":
      rows = parseNebatCsv(content);
      break;
    default:
      rows =
        parseAppleCardCsv(content).length > 0
          ? parseAppleCardCsv(content)
          : parseAmazonCsv(content).length > 0
            ? parseAmazonCsv(content)
            : parsePayPalCsv(content);
  }
  return { source, rows };
}
