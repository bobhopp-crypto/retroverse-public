import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

async function main() {
  const outDir = join(process.cwd(), "reports/media-collections");
  mkdirSync(outDir, { recursive: true });
  const url =
    process.env.MS_REVIEW_URL ??
    "http://localhost:3000/ops/media-collections/midnight-special/review?mode=queue";

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.context().addCookies([
    {
      name: "retroverse_ops_gate",
      value: "ok",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".ms-review-queue--workstation", { timeout: 30000 });
  await page.waitForSelector(".ms-review-queue__video", { timeout: 60000 });

  await page.screenshot({
    path: join(outDir, "ms-review-workstation-desktop.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".ms-review-queue--workstation", { timeout: 30000 });

  await page.screenshot({
    path: join(outDir, "ms-review-workstation-mobile.png"),
    fullPage: false,
  });

  await browser.close();
  console.log(`Wrote screenshots → ${outDir}/ms-review-workstation-*.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
