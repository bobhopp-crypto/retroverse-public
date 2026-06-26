/**
 * Capture chart navigation Phase 1 flow screenshots.
 * Run: npx tsx tools/capture-chart-nav-phase-1.ts
 *
 * Requires dev server: npm run dev
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/chart-nav-phase-1");
const BASE = process.env.CHART_CAPTURE_URL ?? "http://localhost:3000";

/** Year → month → week date (first #1 week in May when available). */
const FLOWS: Array<{ year: number; month: number; week: string; label: string }> = [
  { year: 1978, month: 5, week: "1978-05-06", label: "1978" },
  { year: 1984, month: 5, week: "1984-05-05", label: "1984" },
  { year: 1967, month: 5, week: "1967-05-06", label: "1967" },
];

async function captureFlow(
  page: import("playwright").Page,
  flow: (typeof FLOWS)[number],
) {
  const prefix = join(OUT, flow.label);

  await page.goto(`${BASE}/rv/${flow.year}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${prefix}-01-year.png`, fullPage: true });

  await page.goto(`${BASE}/rv/${flow.year}/${flow.month}`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${prefix}-02-month.png`, fullPage: true });

  await page.goto(`${BASE}/rv/${flow.year}/${flow.month}/${flow.week}`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${prefix}-03-week.png`, fullPage: true });

  await page.goto(`${BASE}/week/${flow.week}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector(".chart-week-portal-list", { timeout: 30_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${prefix}-04-chart.png`, fullPage: true });

  const songLink = page.locator(".chart-week-portal__title-link").first();
  if ((await songLink.count()) > 0) {
    await songLink.click();
    await page.waitForURL("**/retroverse-2/song/**", { timeout: 30_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${prefix}-05-song.png`, fullPage: true });
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  for (const flow of FLOWS) {
    try {
      await captureFlow(page, flow);
      console.log(`Captured ${flow.label} flow`);
    } catch (err) {
      console.error(`Failed ${flow.label}:`, err);
    }
  }

  await browser.close();
  console.log(`Screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
