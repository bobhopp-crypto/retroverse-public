/**
 * Capture episode browser screenshots.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/media-lab");

async function shot(page: import("playwright").Page, name: string) {
  await page.screenshot({ path: join(OUT, name), fullPage: false });
  console.log(`Wrote ${name}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/media-lab?library=episodes`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await shot(page, "episode-browser-list.png");

  await page.goto(`${BASE}/ops/media-lab?library=episodes&view=tree`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-episode-tree", { timeout: 60000 });
  await page.waitForTimeout(1000);
  await shot(page, "episode-browser-tree.png");

  await page.goto(`${BASE}/ops/media-lab?library=episodes&q=Al+Green`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace__list-item", { timeout: 60000 });
  await page.locator(".ml-workspace__browse .ml-workspace__list-item").first().click({ force: true });
  await page.waitForSelector(".ml-episode-detail", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await shot(page, "episode-browser-detail.png");

  await page.locator(".ml-episode-detail__perf-open").first().click();
  await page.waitForSelector(".ml-perf-editor", { timeout: 90000 });
  await page.waitForTimeout(2000);
  await shot(page, "episode-browser-editor.png");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
