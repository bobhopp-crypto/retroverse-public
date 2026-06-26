/**
 * Browser Plus matching phase 1 screenshots.
 * Run: npx tsx tools/capture-browser-plus-matching-phase-1.ts
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/browser-plus-matching-phase1");
const BASE = process.env.CHART_CAPTURE_URL ?? "http://localhost:3000";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${BASE}/ops/browser-plus`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector(".browser-plus", { timeout: 60_000 });
  await page.screenshot({ path: join(OUT, "01-browser-plus-overview.png"), fullPage: true });

  const unmatchedBtn = page.locator('.browser-plus__status-meta button:has-text("Unmatched Videos")');
  if (await unmatchedBtn.count()) {
    await unmatchedBtn.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, "02-unmatched-filter.png"), fullPage: true });
  }

  const firstRow = page.locator(".browser-plus-grid__row").first();
  if (await firstRow.count()) {
    await firstRow.click();
    await page.waitForSelector(".browser-plus-match", { timeout: 30_000 }).catch(() => null);
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, "03-match-panel.png"), fullPage: true });
  }

  await browser.close();
  console.log(`Screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
