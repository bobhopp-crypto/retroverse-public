/**
 * Capture Performance Browser screenshots.
 * Requires: RETROVERSE_OPS=1 npm run dev
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";

async function main() {
  const outDir = join(process.cwd(), "reports/media-collections");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/media-lab/performances`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-perf-browser", { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(outDir, "ms-performance-browser.png"),
    fullPage: false,
  });

  await page.fill('input[type="search"]', "Smokey");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(outDir, "ms-performance-browser-search.png"),
    fullPage: false,
  });

  await browser.close();
  console.log(`Wrote ${outDir}/ms-performance-browser.png`);
  console.log(`Wrote ${outDir}/ms-performance-browser-search.png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
