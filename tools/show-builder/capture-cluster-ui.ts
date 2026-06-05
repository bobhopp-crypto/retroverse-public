import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

async function main() {
  const outDir = join(process.cwd(), "reports/show-builder");
  mkdirSync(outDir, { recursive: true });
  const base = process.env.SHOW_BUILDER_URL ?? "http://localhost:3000/ops/show-builder";

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  await page.context().addCookies([
    {
      name: "retroverse_ops_gate",
      value: "ok",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".ops-show__pool-title", { timeout: 120000 });

  await page.screenshot({
    path: join(outDir, "set-builder-before-clustering-v2.png"),
    fullPage: true,
  });

  await page.locator(".ops-show__cluster-toggle input").check();
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: join(outDir, "set-builder-clustering-v2.png"),
    fullPage: true,
  });

  await page.goto(`${base}?clusterDebug=1`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".ops-show__pool-title", { timeout: 120000 });
  await page.locator(".ops-show__cluster-toggle input").check();
  await page.waitForTimeout(1200);
  await page.waitForSelector(".ops-show__cluster-debug-table tbody tr", { timeout: 120000 });

  await page.screenshot({
    path: join(outDir, "set-builder-cluster-debug-v2.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("Saved screenshots to", outDir);
}

void main();
