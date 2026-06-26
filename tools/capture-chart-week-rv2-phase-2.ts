/**
 * Capture chart week RV2 migration screenshots (Phase 2).
 * Run: npx tsx tools/capture-chart-week-rv2-phase-2.ts
 *
 * Requires dev server: npm run dev
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/chart-nav-phase-2");
const BASE = process.env.CHART_CAPTURE_URL ?? "http://localhost:3000";

const WEEKS = [
  { date: "1972-09-02", label: "1972" },
  { date: "1978-05-06", label: "1978" },
  { date: "1967-07-15", label: "1967" },
];

async function captureChartWeek(
  page: import("playwright").Page,
  week: (typeof WEEKS)[number],
  suffix: string,
) {
  await page.goto(`${BASE}/week/${week.date}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector(".rv2-live", { timeout: 30_000 });
  await page.waitForSelector(".chart-week-portal-list", { timeout: 30_000 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(OUT, `${week.label}-chart-${suffix}.png`),
    fullPage: true,
  });
}

async function captureFullFlow(page: import("playwright").Page) {
  const flow = { year: 1978, month: 5, week: "1978-05-06" };

  await page.goto(`${BASE}/rv/${flow.year}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector(".rv2-live", { timeout: 30_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "flow-01-year.png"), fullPage: true });

  await page.goto(`${BASE}/rv/${flow.year}/${flow.month}`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "flow-02-month.png"), fullPage: true });

  await page.goto(`${BASE}/rv/${flow.year}/${flow.month}/${flow.week}`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "flow-03-week.png"), fullPage: true });

  await page.goto(`${BASE}/week/${flow.week}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector(".chart-week-portal-list", { timeout: 30_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "flow-04-chart.png"), fullPage: true });

  const songLink = page.locator(".chart-week-portal__title-link").first();
  if ((await songLink.count()) > 0) {
    await songLink.click();
    await page.waitForURL("**/retroverse-2/song/**", { timeout: 30_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, "flow-05-song.png"), fullPage: true });
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  for (const week of WEEKS) {
    try {
      await captureChartWeek(page, week, "mobile");
      console.log(`Captured ${week.label} chart (mobile)`);
    } catch (err) {
      console.error(`Failed ${week.label}:`, err);
    }
  }

  try {
    await captureFullFlow(page);
    console.log("Captured full 1978 flow");
  } catch (err) {
    console.error("Failed full flow:", err);
  }

  await browser.close();
  console.log(`Screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
