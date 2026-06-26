/**
 * Phase 4A+4B coverage screenshots (mobile 390×844).
 * Run: npx tsx tools/capture-coverage-phase-4.ts
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/coverage-phase-4");
const BASE = process.env.CHART_CAPTURE_URL ?? "http://localhost:3000";

async function capture(page: import("playwright").Page, url: string, name: string) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector(".rv2-coverage-badge", { timeout: 30_000 });
  await page.screenshot({ path: join(OUT, name), fullPage: true });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // 1975 Hot 100 — Rhinestone Cowboy #1 (VIDEO-owned, not MUSIC)
  await capture(page, "/week/1975-09-06", "1975-chart-week-all.png");

  await page.locator('.rv2-coverage-filter__btn:has-text("MISSING")').click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(OUT, "1975-chart-week-filter-missing.png"), fullPage: true });

  await page.locator('.rv2-coverage-filter__btn:has-text("ALL")').click();
  await page.waitForTimeout(200);

  // Top 3 rows crop for verification report
  const topRows = page.locator(".chart-week-portal__row").first();
  await topRows.waitFor({ timeout: 10_000 });
  await page.locator(".chart-week-portal-list").screenshot({
    path: join(OUT, "1975-top3-badges-crop.png"),
  });

  await capture(page, "/rv/1975", "1975-year-top-singles.png");
  await capture(page, "/rv/1975/9", "1975-month-summaries.png");

  await page.goto(`${BASE}/week/1978-05-06`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector(".rv2-coverage-filter", { timeout: 30_000 });
  await page.screenshot({ path: join(OUT, "1978-chart-week-filters.png"), fullPage: true });

  await browser.close();
  console.log(`Screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
