/**
 * Capture clip review integration screenshots.
 * Requires: RETROVERSE_OPS=1 npm run dev
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";
const REVIEW_PERF = process.env.MS_CLIP_PERF ?? "--wR-ZACg8Q:ch009";
const REVIEW_EP = process.env.MS_CLIP_EP ?? "--wR-ZACg8Q";

async function main() {
  const outDir = join(process.cwd(), "reports/media-collections");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  const queueUrl = `${BASE}/ops/media-collections/midnight-special/review?mode=queue`;
  await page.goto(queueUrl, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".ms-review-queue__primary-actions", { timeout: 60000 });
  await page.screenshot({
    path: join(outDir, "ms-clip-review-queue.png"),
    fullPage: false,
  });

  const clipUrl = `${BASE}/ops/media-lab?collection=midnight-special&episode=${encodeURIComponent(REVIEW_EP)}&mode=clip_review&performance=${encodeURIComponent(REVIEW_PERF)}&return=${encodeURIComponent("/ops/media-collections/midnight-special/review?mode=queue")}`;
  await page.goto(clipUrl, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".ops-ml-ms-clip-review__video", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(outDir, "ms-clip-review-media-lab.png"),
    fullPage: false,
  });

  await browser.close();
  console.log(`Wrote ${outDir}/ms-clip-review-queue.png`);
  console.log(`Wrote ${outDir}/ms-clip-review-media-lab.png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
