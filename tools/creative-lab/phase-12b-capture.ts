/**
 * Phase 12b workstation shell screenshots.
 * Usage: RETROVERSE_OPS=1 npx tsx tools/creative-lab/phase-12b-capture.ts
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/creative-lab");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/creative-lab`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-ws", { timeout: 60000 });
  await page.screenshot({ path: join(OUT, "phase-12b-after-empty.png"), fullPage: false });

  const projectBtn = page.locator(".cl-ws__project-btn").first();
  if ((await projectBtn.count()) > 0) {
    await projectBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, "phase-12b-after-project.png"), fullPage: false });

    const thumb = page.locator(".cl-ws__thumb").first();
    if ((await thumb.count()) > 0) {
      await thumb.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT, "phase-12b-after-inspector.png"), fullPage: false });
    }
  }

  await browser.close();
  console.log("Screenshots saved to reports/creative-lab/phase-12b-after-*.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
