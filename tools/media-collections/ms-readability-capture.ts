/**
 * Capture Media Lab readability pass screenshots.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "ipad-landscape", width: 1180, height: 820 },
  { name: "iphone-landscape", width: 844, height: 390 },
] as const;

async function capture(viewport: (typeof VIEWPORTS)[number]) {
  const outDir = join(process.cwd(), "reports/media-lab");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/media-lab?library=performances&q=Smokey`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace", { timeout: 60000 });

  const browse = page.locator(".ml-workspace__browse");
  await browse.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const firstItem = browse.locator(".ml-workspace__list-item").first();
  if ((await firstItem.count()) > 0) {
    await firstItem.click({ force: true });
    await page.waitForSelector(".ml-perf-editor", { timeout: 90000 }).catch(() => null);
  }
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: join(outDir, `readability-after-${viewport.name}.png`),
    fullPage: false,
  });

  await browser.close();
  console.log(`Wrote readability-after-${viewport.name}.png`);
}

async function main() {
  for (const vp of VIEWPORTS) {
    await capture(vp);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
