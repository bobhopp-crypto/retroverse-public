/**
 * Capture finance Phase 3 screenshots.
 * Run: RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-phase3.ts
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/finance");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const HOST = new URL(BASE).hostname;

const PAGES = [
  { path: "/ops/finance", file: "finance-dashboard-phase3.png" },
  { path: "/ops/finance/import", file: "finance-import-center-phase3.png" },
  { path: "/ops/finance/review", file: "finance-review-queue-phase3.png" },
  { path: "/ops/finance/ledger", file: "finance-ledger-phase3.png" },
  { path: "/ops/finance/import-amazon", file: "finance-amazon-import-phase3.png" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1728, height: 1117 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: HOST, path: "/" },
  ]);

  for (const shot of PAGES) {
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, shot.file), fullPage: true });
    console.log(`Wrote ${shot.file}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
