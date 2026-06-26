/**
 * Capture Experience 7.0 song page screenshot.
 * Run: RETROVERSE_DEV_NO_CLEAN=1 npx next dev -p 3000
 * Then: npx tsx tools/experience/capture-song-experience.ts RVTR044043
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/experience-2.0");
const BASE = process.env.EXPERIENCE_CAPTURE_URL ?? "http://localhost:3000";
const rvtr = (process.argv[2] ?? "RVTR044043").toUpperCase();

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(`${BASE}/retroverse-2/song/${rvtr}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForSelector(".rv2-song__hero", { timeout: 60_000 });
  await page.waitForSelector(".rv-exp-cj", { timeout: 60_000 }).catch(() => null);
  await page.waitForTimeout(800);

  const outFile = join(OUT, `experience-7.0-${rvtr.toLowerCase()}-mobile.png`);
  await page.screenshot({ path: outFile, fullPage: true });
  await browser.close();

  console.log(`Wrote ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
