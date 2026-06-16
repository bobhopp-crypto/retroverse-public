/**
 * Test NEBAT PDF parser on uploaded samples.
 * Run: npx tsx tools/finance/test-nebat-pdf.ts [pdf-path]
 */
import { readFileSync } from "fs";
import { resolve } from "path";

import { parseNebatPdfText } from "../../lib/ops/finance/parsers/nebat-pdf";

const pdfPath = process.argv[2] ?? "data/finance-imports/20/GetDocument-5.pdf";

async function main() {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    buf: Buffer,
  ) => Promise<{ text: string }>;
  const buf = readFileSync(resolve(pdfPath));
  const { text } = await pdfParse(buf);
  const parsed = parseNebatPdfText(text);

  console.log("File:", pdfPath);
  console.log("Kind:", parsed.kind);
  if (parsed.kind === "checking") {
    console.log("Period:", parsed.statementStart, "→", parsed.statementEnd);
    console.log("Transactions:", parsed.transactions.length);
    for (const t of parsed.transactions) {
      console.log(
        t.transactionDate,
        t.flowKind.padEnd(8),
        `$${t.amount.toFixed(2)}`.padStart(10),
        t.accountName?.padEnd(30),
        t.description.slice(0, 50),
      );
    }
  } else {
    console.log(parsed);
  }
}

void main();
