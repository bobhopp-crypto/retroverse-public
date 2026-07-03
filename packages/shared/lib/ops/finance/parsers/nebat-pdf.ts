import type { FinanceFlowKind } from "@/lib/ops/finance/finance-model";
import type { FinanceImportance } from "@/lib/ops/finance/finance-importance";

export type NebatClassification = {
  accountName: string;
  flowKind: FinanceFlowKind;
  importance: FinanceImportance | null;
  taxTreatment: string | null;
  reviewRequired: boolean;
};

export type ParsedNebatTransaction = {
  transactionDate: string;
  description: string;
  amount: number;
  flowKind: FinanceFlowKind;
  accountName: string | null;
  importance: FinanceImportance | null;
  taxTreatment: string | null;
  reviewStatus: "pending" | "approved";
  dedupeKey: string;
};

export type ParsedNebatCheckingStatement = {
  kind: "checking";
  statementStart: string | null;
  statementEnd: string | null;
  accountMasked: string | null;
  beginningBalance: number | null;
  endingBalance: number | null;
  totalAdditions: number | null;
  totalSubtractions: number | null;
  transactions: ParsedNebatTransaction[];
  dedupeKey: string;
};

export type ParsedNebatMortgageStatement = {
  kind: "mortgage";
  statementDate: string | null;
  paymentDueDate: string | null;
  amountDue: number | null;
  scheduledPayment: number | null;
  principal: number | null;
  interest: number | null;
  escrow: number | null;
  outstandingPrincipal: number | null;
  interestRate: number | null;
  maturityDate: string | null;
  activityPaymentAmount: number | null;
  activityPaymentDate: string | null;
  dedupeKey: string;
};

export type ParsedNebatPdf = ParsedNebatCheckingStatement | ParsedNebatMortgageStatement;

function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function collapsePdfNoise(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      const half = Math.floor(t.length / 2);
      if (half > 10 && t.slice(0, half) === t.slice(half, half * 2)) {
        return t.slice(0, half).trim();
      }
      return t;
    })
    .filter(Boolean)
    .join("\n");
}

function parseStatementYear(text: string, fallback: number): number {
  const m =
    text.match(/This statement:\s*(\w+)\s+(\d{1,2}),\s+(\d{4})/i) ??
    text.match(/Statement Date:\s*(\d{2})\/(\d{2})\/(\d{4})/i) ??
    text.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
  if (m?.[3]) return Number(m[3]);
  if (m && "length" in m && m[0]?.includes("/")) {
    const parts = m[0].match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (parts?.[3]) return Number(parts[3]);
  }
  return fallback;
}

function mdY(year: number, mm: string, dd: string): string {
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

const NEBAT_RULES: { pattern: RegExp; classification: NebatClassification }[] = [
  {
    pattern: /SSA\s+TREAS.*XXSOC\s+SEC/i,
    classification: {
      accountName: "Social Security",
      flowKind: "income",
      importance: "required",
      taxTreatment: "Personal Income",
      reviewRequired: false,
    },
  },
  {
    pattern: /AGNESIAN\s+HEALTHC.*PAYROLL/i,
    classification: {
      accountName: "SSM Health",
      flowKind: "income",
      importance: "required",
      taxTreatment: "W-2 Income",
      reviewRequired: false,
    },
  },
  {
    pattern: /APPLECARD\s+GSBANK\s+PAYMENT/i,
    classification: {
      accountName: "Transfer - Apple Card Payment",
      flowKind: "transfer",
      importance: null,
      taxTreatment: null,
      reviewRequired: false,
    },
  },
  {
    pattern: /AUTOMATIC\s+LOAN\s+PAY/i,
    classification: {
      accountName: "Mortgage",
      flowKind: "expense",
      importance: "required",
      taxTreatment: "Personal",
      reviewRequired: false,
    },
  },
  {
    pattern: /PAYPAL\s+INST\s+XFER/i,
    classification: {
      accountName: "Transfer - PayPal",
      flowKind: "transfer",
      importance: null,
      taxTreatment: null,
      reviewRequired: false,
    },
  },
  {
    pattern: /PAYPAL\s+PURCHASE/i,
    classification: {
      accountName: "PayPal",
      flowKind: "expense",
      importance: "optional",
      taxTreatment: "Personal",
      reviewRequired: false,
    },
  },
  {
    pattern: /IRS\s+TREAS.*TAX\s+REF/i,
    classification: {
      accountName: "Tax Refund",
      flowKind: "income",
      importance: "required",
      taxTreatment: "Personal Income",
      reviewRequired: false,
    },
  },
  {
    pattern: /WI\s+DEPT\s+REVENUE.*WISTTAXRFD/i,
    classification: {
      accountName: "Tax Refund",
      flowKind: "income",
      importance: "required",
      taxTreatment: "Personal Income",
      reviewRequired: false,
    },
  },
  {
    pattern: /DEPOSIT\s+MOBILE/i,
    classification: {
      accountName: "Deposit - Needs Review",
      flowKind: "income",
      importance: "required",
      taxTreatment: "Personal Income",
      reviewRequired: true,
    },
  },
];

export function classifyNebatDescription(description: string): NebatClassification {
  for (const rule of NEBAT_RULES) {
    if (rule.pattern.test(description)) return rule.classification;
  }
  return {
    accountName: "Deposit - Needs Review",
    flowKind: "expense",
    importance: "optional",
    taxTreatment: "Personal",
    reviewRequired: true,
  };
}

function extractDescriptions(text: string): string[] {
  const block =
    text.match(
      /Fond Du Lac WI 54935-3134\s*([\s\S]*?)(?:Relationship Checking|OVERDRAFT\/RETURN ITEM FEES)/i,
    )?.[1] ?? "";
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 6 && /^[A-Z0-9]/.test(l) && !/^(USE |EQUAL|HAPPY|MARK|DEBITS|CREDITS)/.test(l));
}

function parseCheckingStatement(text: string): ParsedNebatCheckingStatement {
  const clean = collapsePdfNoise(text);
  const year = parseStatementYear(clean, new Date().getFullYear());

  const lastStmt = clean.match(/Last statement:\s*(\w+)\s+(\d{1,2}),\s+(\d{4})/i);
  const thisStmt = clean.match(/This statement:\s*(\w+)\s+(\d{1,2}),\s+(\d{4})/i);

  const statementStart = lastStmt
    ? mdY(Number(lastStmt[3]), monthToNum(lastStmt[1]!), lastStmt[2]!)
    : null;
  const statementEnd = thisStmt
    ? mdY(Number(thisStmt[3]), monthToNum(thisStmt[1]!), thisStmt[2]!)
    : null;

  const accountMasked = clean.match(/Account number\s+XXXX-XX-(\d+)/i)?.[0] ?? null;
  const beginningBalance = parseMoney(clean.match(/Beginning balance\s+\$?([\d,.]+)/i)?.[1] ?? "");
  const endingBalance = parseMoney(clean.match(/Ending balance\s+\$?([\d,.]+)/i)?.[1] ?? "");
  const totalAdditions = parseMoney(clean.match(/Total additions\s+([\d,.]+)/i)?.[1] ?? "");
  const totalSubtractions = parseMoney(clean.match(/Total subtractions\s+([\d,.]+)/i)?.[1] ?? "");

  const rowRe =
    /(\d{2})-(\d{2})'(?:Preauthorized Wd|Automatic Ln Paymt|Preauthorized Credit)\s+([\d,]+\.\d{2})/gi;
  const rows: { mm: string; dd: string; amount: number; isCredit: boolean }[] = [];
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(clean))) {
    const line = match[0];
    rows.push({
      mm: match[1]!,
      dd: match[2]!,
      amount: parseMoney(match[3]!) ?? 0,
      isCredit: line.includes("Credit"),
    });
  }

  const descriptions = extractDescriptions(clean);
  const transactions: ParsedNebatTransaction[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const description = descriptions[i] ?? `NEBAT ${row.mm}-${row.dd}`;
    const txnYear = Number(row.mm) > 6 && statementEnd?.startsWith(String(year)) ? year : year;
    const date = mdY(txnYear, row.mm, row.dd);
    const classified = classifyNebatDescription(description);
    const flowKind = row.isCredit ? "income" : classified.flowKind === "income" ? "income" : classified.flowKind;

    transactions.push({
      transactionDate: date,
      description,
      amount: row.amount,
      flowKind: row.isCredit ? "income" : flowKind,
      accountName: classified.accountName,
      importance: classified.importance,
      taxTreatment: classified.taxTreatment,
      reviewStatus: classified.reviewRequired ? "pending" : "approved",
      dedupeKey: `nebat|${statementEnd ?? "unknown"}|${date}|${row.amount.toFixed(2)}|${description.slice(0, 80)}`,
    });
  }

  return {
    kind: "checking",
    statementStart,
    statementEnd,
    accountMasked,
    beginningBalance,
    endingBalance,
    totalAdditions,
    totalSubtractions,
    transactions,
    dedupeKey: `nebat-checking|${statementEnd ?? "unknown"}|${accountMasked ?? "acct"}`,
  };
}

function monthToNum(name: string): string {
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  return months[name.toLowerCase()] ?? "01";
}

function parseMortgageStatement(text: string): ParsedNebatMortgageStatement {
  const clean = collapsePdfNoise(text);
  const stmt = clean.match(/Statement Date:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const statementDate = stmt ? `${stmt[3]}-${stmt[1]}-${stmt[2]}` : null;
  const due = clean.match(/Payment Due Date\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const paymentDueDate = due ? `${due[3]}-${due[1]}-${due[2]}` : null;

  const amountDue = parseMoney(clean.match(/Amount Due\s+\$?([\d,.]+)/i)?.[1] ?? "");
  const scheduledPayment = parseMoney(
    clean.match(/Scheduled Payment Amount\s+\$?([\d,.]+)/i)?.[1] ?? "",
  );
  const principal = parseMoney(
    clean.match(/Principal\s+\$?([\d,.]+)\s+Interest/i)?.[1] ??
      clean.match(/Principal\s+\$?([\d,.]+)/i)?.[1] ??
      "",
  );
  const interest = parseMoney(clean.match(/Interest\s+\$?([\d,.]+)\s+Escrow/i)?.[1] ?? "");
  const escrow = parseMoney(
    clean.match(/Escrow \(Taxes and\/or Insurance\)\s+\$?([\d,.]+)/i)?.[1] ?? "",
  );
  const outstandingPrincipal = parseMoney(
    clean.match(/Outstanding Principal\s+\$?([\d,.]+)/i)?.[1] ?? "",
  );
  const rateRaw = clean.match(/Interest Rate\s+([\d.]+)%/i)?.[1];
  const interestRate = rateRaw ? Number(rateRaw) : null;
  const maturity = clean.match(/Maturity Date\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const maturityDate = maturity ? `${maturity[3]}-${maturity[1]}-${maturity[2]}` : null;

  const activity = clean.match(
    /Transaction Activity[\s\S]*?(\d{2}\/\d{2}\/\d{2,4})[\s\S]*?\$?([\d,.]+)/i,
  );

  return {
    kind: "mortgage",
    statementDate,
    paymentDueDate,
    amountDue,
    scheduledPayment,
    principal,
    interest,
    escrow,
    outstandingPrincipal,
    interestRate,
    maturityDate,
    activityPaymentAmount: scheduledPayment,
    activityPaymentDate: paymentDueDate,
    dedupeKey: `nebat-mortgage|${statementDate ?? "unknown"}`,
  };
}

export function parseNebatPdfText(text: string): ParsedNebatPdf {
  const clean = collapsePdfNoise(text);
  if (/LOAN\s+STATEMENT/i.test(clean)) {
    return parseMortgageStatement(clean);
  }
  return parseCheckingStatement(clean);
}

export async function parseNebatPdf(buffer: Buffer): Promise<ParsedNebatPdf> {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    buf: Buffer,
  ) => Promise<{ text: string }>;
  const { text } = await pdfParse(buffer);
  return parseNebatPdfText(text);
}
