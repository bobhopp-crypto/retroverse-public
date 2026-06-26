/**
 * Capture Search page for RV2 shell migration regression check.
 * Run: npx tsx tools/capture-search-rv2-step2.ts [before|after]
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const phase = process.argv[2] === "after" ? "after" : "before";
const OUT = join(process.cwd(), "reports/search-rv2-step2", phase);
const BASE = process.env.RV2_CAPTURE_URL ?? "http://localhost:3000";

const QUERIES = [
  { slug: "joe-cocker", q: "joe cocker" },
  { slug: "beatles", q: "beatles" },
  { slug: "1967", q: "1967" },
  { slug: "play-with-fire", q: "Play With Fire" },
] as const;

async function captureSearch(page: import("playwright").Page, q: string, slug: string) {
  const url = `${BASE}/search?q=${encodeURIComponent(q)}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector(".rv2-live__topbar, .search-page", { timeout: 30_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, `mobile-${slug}.png`), fullPage: true });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  for (const { slug, q } of QUERIES) {
    await captureSearch(page, q, slug);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await captureSearch(page, "joe cocker", "desktop-joe-cocker");

  await browser.close();
  console.log(`Saved ${phase} search screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
