/**
 * Finance UX pass screenshots (desktop + mobile).
 * Run: RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-ux-pass.ts
 * Requires dev server on BASE_URL (default http://localhost:3001).
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium, type Page } from "playwright";

const OUT = join(process.cwd(), "reports/finance/ux-pass");
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const HOST = new URL(BASE).hostname;

const ROUTES = [
  { name: "home-desktop", path: "/ops/finance", width: 1440, height: 900 },
  { name: "home-mobile", path: "/ops/finance", width: 390, height: 844 },
  { name: "category-audit-desktop", path: "/ops/finance/reports/category-audit", width: 1440, height: 900 },
  { name: "nebat-desktop", path: "/ops/finance/accounts/nebat-checking", width: 1440, height: 900 },
  { name: "nebat-mobile", path: "/ops/finance/accounts/nebat-checking", width: 390, height: 844 },
  { name: "apple-desktop", path: "/ops/finance/accounts/apple-card", width: 1440, height: 900 },
  { name: "apple-mobile", path: "/ops/finance/accounts/apple-card", width: 390, height: 844 },
] as const;

async function shot(page: Page, file: string) {
  await page.screenshot({ path: join(OUT, file), fullPage: true });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: route.width, height: route.height } });
    await page.context().addCookies([
      { name: "retroverse_ops_gate", value: "ok", domain: HOST, path: "/" },
    ]);
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForSelector(".ops-finance-spend, .ops-finance-account", { timeout: 45_000 });
    await shot(page, `${route.name}.png`);
    await page.close();
    console.log(`Wrote ${route.name}.png`);
  }

  // Category drill-down on home (Utilities bar)
  const drill = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await drill.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: HOST, path: "/" },
  ]);
  await drill.goto(`${BASE}/ops/finance`, { waitUntil: "networkidle", timeout: 90_000 });
  await drill.getByRole("button", { name: "Utilities" }).click();
  await drill.waitForTimeout(300);
  const utilBar = drill.locator(".ops-finance-spend__bar-col").filter({ hasText: "May" }).first();
  if (await utilBar.count()) {
    await utilBar.click();
    await drill.waitForTimeout(500);
    await shot(drill, "home-utilities-may-drill-desktop.png");
  }
  await drill.close();

  await browser.close();
  console.log(`\nScreenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
