/**
 * Capture Media Lab bug-fix verification screenshots.
 * Usage: npx tsx tools/media-collections/ms-trim-bugfix-capture.ts
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/media-lab");

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/media-lab?library=episodes`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace", { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "trim-bugfix-episode-browser.png"), fullPage: false });

  await page.goto(`${BASE}/ops/media-lab?library=performances`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace", { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "trim-bugfix-performance-browser.png"), fullPage: false });

  await page.goto(`${BASE}/ops/media-lab?library=performances&q=Smokey`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace__list-item", { timeout: 60000 });
  await page.locator(".ml-workspace__list-item").first().click();
  await page.waitForSelector(".ops-ml-review__video", { timeout: 120000 });
  await page.waitForTimeout(1200);

  const queueBtn = page.locator("button.ops-ml-review__queue-badge:not(.ops-ml-review__queue-badge--harvest)");
  await queueBtn.click({ force: true });
  await page.waitForSelector(".ops-ml-review-queue-drawer--open", { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "trim-bugfix-queue-drawer.png"), fullPage: false });

  const fsErrors = consoleErrors.filter((e) => /fs\/promises|Can't resolve 'fs/i.test(e));
  if (fsErrors.length) {
    console.error("fs/promises console errors:", fsErrors);
    process.exitCode = 1;
  } else {
    console.log("No fs/promises console errors");
  }

  await browser.close();
  console.log(`Wrote screenshots to ${OUT}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
