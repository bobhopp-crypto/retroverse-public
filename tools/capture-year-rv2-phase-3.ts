/**
 * Capture Year RV2 Phase 3 before/after screenshots.
 * Run: npx tsx tools/capture-year-rv2-phase-3.ts
 */
import { copyFile, mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/year-rv2-phase3a");
const BEFORE_SRC = join(process.cwd(), "reports/chart-nav-phase-2/flow-01-year.png");
const BASE = process.env.CHART_CAPTURE_URL ?? "http://localhost:3000";

const YEARS = [1978, 1984, 1967];

async function main() {
  await mkdir(OUT, { recursive: true });

  try {
    await copyFile(BEFORE_SRC, join(OUT, "before-1978-year-partial-rv2.png"));
  } catch {
    console.warn("Before screenshot not found — skip copy");
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  for (const year of YEARS) {
    await page.goto(`${BASE}/rv/${year}`, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForSelector(".rv2-live", { timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `after-${year}-year-mobile.png`), fullPage: true });

    await page.goto(`${BASE}/rv/${year}/5`, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForSelector(".rv2-live", { timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `after-${year}-month-mobile.png`), fullPage: true });
    console.log(`Captured ${year}`);
  }

  await browser.close();
  console.log(`Screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
