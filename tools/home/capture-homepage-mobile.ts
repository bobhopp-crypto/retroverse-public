/**
 * Capture homepage mobile screenshots.
 * Run: npx tsx tools/home/capture-homepage-mobile.ts [before|after]
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports");
const BASE = process.env.HOME_CAPTURE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };

async function main() {
  const label = process.argv[2] === "before" ? "before" : "after";
  const outFile = join(OUT, `homepage-mobile-${label}.png`);

  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(".home-directory__year-number", { timeout: 30_000 });
  await page.screenshot({ path: outFile, fullPage: true });
  await browser.close();

  console.log(JSON.stringify({ outFile, viewport: VIEWPORT, url: BASE }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
