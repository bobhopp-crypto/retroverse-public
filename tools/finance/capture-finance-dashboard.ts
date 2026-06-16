/**
 * Capture /ops/finance dashboard screenshot.
 * Run: RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-dashboard.ts
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/finance");
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const HOST = new URL(BASE).hostname;

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({
    viewport: { width: 1728, height: 1117 },
  });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: HOST, path: "/" },
  ]);

  await page.goto(`${BASE}/ops/finance`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(".ops-finance", { timeout: 30_000 });

  await page.screenshot({
    path: join(OUT, "finance-dashboard-phase2-retirement.png"),
    fullPage: true,
  });

  await browser.close();
  console.log(`Wrote ${join(OUT, "finance-dashboard-phase2-retirement.png")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
