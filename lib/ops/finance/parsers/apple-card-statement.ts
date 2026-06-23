/** Apple Card statement metadata — separate from transaction CSV parsing. */

export type ParsedAppleCardStatement = {
  statementPeriod: string;
  statementStart: string;
  statementEnd: string;
  previousBalance: number;
  endingBalance: number;
  totalBalance: number | null;
  minimumDue: number | null;
  dueDate: string | null;
  paymentTotal: number | null;
  purchaseTotal: number | null;
  interestTotal: number;
  dailyCashTotal: number | null;
  monthlyInstallmentRemaining: number | null;
  dedupeKey: string;
};

export function buildAppleCardDedupeKey(statementEnd: string): string {
  return `apple-card|${statementEnd.slice(0, 10)}`;
}

export function statementPeriodLabel(statementEnd: string): string {
  return new Date(`${statementEnd.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Canonical Jan 2026 — user-provided statement totals. */
export const APPLE_CARD_JAN_2026: ParsedAppleCardStatement = {
  statementPeriod: "January 2026",
  statementStart: "2026-01-01",
  statementEnd: "2026-01-31",
  previousBalance: 1776.45,
  endingBalance: 1005.14,
  totalBalance: 2824.59,
  minimumDue: 284.91,
  dueDate: "2026-02-28",
  paymentTotal: 3250.0,
  purchaseTotal: 2218.78,
  interestTotal: 0,
  dailyCashTotal: 31.53,
  monthlyInstallmentRemaining: 2079.36,
  dedupeKey: buildAppleCardDedupeKey("2026-01-31"),
};

/**
 * Parse statement metadata from Apple Card PDF text (future).
 * Returns null when PDF does not contain statement summary block.
 */
export function parseAppleCardStatementFromText(text: string): ParsedAppleCardStatement | null {
  const clean = text.replace(/\s+/g, " ");
  const endMatch = clean.match(
    /(?:statement period|billing period)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})\s*(?:through|to|-)\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
  );
  const previous = clean.match(/previous\s+(?:monthly\s+)?balance[^$]*\$?([\d,]+\.\d{2})/i);
  const ending = clean.match(/(?:statement\s+)?(?:ending|new)\s+balance[^$]*\$?([\d,]+\.\d{2})/i);
  if (!ending) return null;

  const money = (raw: string | undefined) =>
    raw ? Number(raw.replace(/[$,]/g, "")) : null;

  const statementEnd = endMatch ? parseFlexibleDate(endMatch[2]!) : null;
  const statementStart = endMatch ? parseFlexibleDate(endMatch[1]!) : null;
  if (!statementEnd) return null;

  return {
    statementPeriod: statementPeriodLabel(statementEnd),
    statementStart: statementStart ?? statementEnd,
    statementEnd,
    previousBalance: money(previous?.[1]) ?? 0,
    endingBalance: money(ending[1])!,
    totalBalance: money(clean.match(/total balance[^$]*\$?([\d,]+\.\d{2})/i)?.[1]),
    minimumDue: money(clean.match(/minimum payment due[^$]*\$?([\d,]+\.\d{2})/i)?.[1]),
    dueDate: parseFlexibleDate(clean.match(/payment due[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/i)?.[1] ?? ""),
    paymentTotal: money(clean.match(/payments?(?:\s+during)?[^$]*\$?([\d,]+\.\d{2})/i)?.[1]),
    purchaseTotal: money(clean.match(/(?:charges|purchases?)(?:\s+during)?[^$]*\$?([\d,]+\.\d{2})/i)?.[1]),
    interestTotal: money(clean.match(/interest charged[^$]*\$?([\d,]+\.\d{2})/i)?.[1]) ?? 0,
    dailyCashTotal: money(clean.match(/daily cash[^$]*\$?([\d,]+\.\d{2})/i)?.[1]),
    monthlyInstallmentRemaining: money(
      clean.match(/monthly installment remaining[^$]*\$?([\d,]+\.\d{2})/i)?.[1],
    ),
    dedupeKey: buildAppleCardDedupeKey(statementEnd),
  };
}

function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
