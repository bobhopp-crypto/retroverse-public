import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/show-builder/clustering-deep-dive/screenshots");

async function captureYear(page: import("playwright").Page, year: number) {
  await page.goto(`http://localhost:3000/ops/show-builder?clusterCompare=1`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ops-show__cluster-compare", { timeout: 120000 });
  await page.click(`.ops-show__year-tab:has-text("${year}")`);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, `compare-${year}.png`),
    fullPage: true,
  });

  await page.goto("http://localhost:3000/ops/show-builder", {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.click(`.ops-show__year-tab:has-text("${year}")`);
  await page.locator(".ops-show__cluster-toggle input").check();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, `best-ui-${year}.png`),
    fullPage: true,
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  for (const year of [1967, 1978, 1992]) {
    await captureYear(page, year);
    console.log("captured", year);
  }

  await browser.close();
  console.log("Saved to", OUT);
}

void main();
