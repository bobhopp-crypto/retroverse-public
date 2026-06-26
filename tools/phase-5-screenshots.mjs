/**
 * Phase 5 mobile + desktop screenshots.
 * Requires: npm run dev + ops gate cookie
 *
 * Usage: node tools/phase-5-screenshots.mjs
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, devices } from "playwright";

const base = process.env.RETROVERSE_SCREENSHOT_BASE ?? "http://localhost:3000";
const outDir = join(process.cwd(), "reports/collection-phase-5");

const desktopPages = [
  { path: "/ops/browser-plus", file: "browser-plus-dashboard-desktop.png" },
  { path: "/artist/joe-cocker/songs", file: "artist-coverage-songs-desktop.png" },
  { path: "/week/1975-09-06", file: "chart-week-coverage-desktop.png" },
];

const mobilePages = [
  { path: "/ops/browser-plus", file: "browser-plus-dashboard-mobile.png" },
  { path: "/artist/joe-cocker/songs", file: "artist-coverage-songs-mobile.png" },
  { path: "/week/1975-09-06", file: "chart-week-coverage-mobile.png" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const cookie = {
  name: "retroverse_ops_gate",
  value: "ok",
  domain: new URL(base).hostname,
  path: "/",
};

{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await context.addCookies([cookie]);
  for (const { path, file } of desktopPages) {
    const page = await context.newPage();
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(outDir, file), fullPage: true });
    await page.close();
    console.log(`Wrote ${file}`);
  }
  await context.close();
}

{
  const iphone = devices["iPhone 13"];
  const context = await browser.newContext({ ...iphone });
  await context.addCookies([cookie]);
  for (const { path, file } of mobilePages) {
    const page = await context.newPage();
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(outDir, file), fullPage: true });
    await page.close();
    console.log(`Wrote ${file}`);
  }
  await context.close();
}

await browser.close();
console.log(`\nScreenshots: ${outDir}`);
