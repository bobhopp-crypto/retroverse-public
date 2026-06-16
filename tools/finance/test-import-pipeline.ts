/**
 * Test finance import pipeline (requires Postgres + RETROVERSE_OPS=1).
 * Run: RETROVERSE_OPS=1 npx tsx tools/finance/test-import-pipeline.ts
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { countReviewQueue } from "@/lib/ops/finance/db/transactions";
import { processFinanceUpload } from "@/lib/ops/finance/import-service";
import { parseAmazonOrderPdfText } from "@/lib/ops/finance/parsers/amazon-pdf";
import { parseAmazonOrderHistoryCsv } from "@/lib/ops/finance/parsers/amazon-order-csv";
import { matchRule, listFinanceRules } from "@/lib/ops/finance/db/rules";

const FIXTURES = join(process.cwd(), "tools/finance/fixtures");

async function main() {
  await ensureFinanceSchema();
  const rules = await listFinanceRules();

  console.log("=== Rule engine ===");
  const openai = matchRule(rules, "OPENAI CHATGPT", "subscription");
  const netflix = matchRule(rules, "NETFLIX.COM", "streaming");
  console.log("OPENAI rule:", openai ? "matched" : "MISS");
  console.log("NETFLIX rule:", netflix ? "matched" : "MISS");

  console.log("\n=== Amazon order history CSV ===");
  const historyCsv = await readFile(join(FIXTURES, "amazon-order-history-sample.csv"), "utf8");
  const historyOrders = parseAmazonOrderHistoryCsv(historyCsv);
  console.log(`Parsed ${historyOrders.length} orders from CSV`);

  console.log("\n=== Amazon PDF text parser ===");
  const amazonText = await readFile(join(FIXTURES, "amazon-order-sample.txt"), "utf8");
  const orders = parseAmazonOrderPdfText(amazonText);
  console.log(`Parsed ${orders.length} orders, ${orders.reduce((s, o) => s + o.items.length, 0)} items`);
  if (orders[0]) {
    console.log("Sample item category:", orders[0].items[0]?.categorySlug);
  }

  console.log("\n=== CSV imports (duplicate test: run twice) ===");
  for (const file of ["apple-card-sample.csv", "amazon-sample.csv", "nebat-sample.csv"]) {
    const buffer = await readFile(join(FIXTURES, file));
    const result = await processFinanceUpload({
      fileName: file,
      buffer,
      mimeType: "text/csv",
    });
    console.log(
      `${file}: inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped} pending=${result.pending}`,
    );
  }

  const pending = await countReviewQueue({
    period: "lifetime",
    from: null,
    to: null,
    sources: [],
    categories: [],
  });
  console.log(`\nReview queue: ${pending} pending transactions`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
