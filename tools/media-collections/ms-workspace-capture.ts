/**
 * Capture Media Lab workspace screenshots.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";

async function main() {
  const outDir = join(process.cwd(), "reports/media-lab");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/media-lab?library=performances`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace", { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(outDir, "media-lab-workspace.png"), fullPage: false });

  await page.click(".ml-workspace__section-btn >> text=Episodes");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, "media-lab-workspace-episodes.png"), fullPage: false });

  await page.goto(`${BASE}/ops/media-lab?library=performances&q=Smokey`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace__list-item", { timeout: 60000 });
  await page.locator(".ml-workspace__list-item").first().click();
  await page.waitForSelector(".ops-ml-ms-clip-review__video", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outDir, "media-lab-workspace-editor.png"), fullPage: false });

  await browser.close();
  console.log(`Wrote screenshots to ${outDir}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
