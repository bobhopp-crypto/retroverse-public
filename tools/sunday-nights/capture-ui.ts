import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium, type Page } from "playwright";

const BASE = process.env.SUNDAY_NIGHTS_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/sunday-nights/screenshots");

async function seedNowPlaying(page: Page) {
  const res = await page.request.patch(`${BASE}/api/ops/sunday-nights`, {
    data: { op: "setTrack", currentTrackId: "RVTR009991" },
  });
  if (!res.ok()) {
    console.warn("[capture] Could not seed track via ops API:", res.status());
  }
}

async function captureViewport(page: Page, name: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}/sunday-nights`, { waitUntil: "networkidle" });
  await page.waitForSelector(".track-embed", { timeout: 30000 });
  await page.screenshot({
    path: join(OUT, name),
    fullPage: false,
  });
}

async function captureFull(page: Page, name: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}/sunday-nights`, { waitUntil: "networkidle" });
  await page.waitForSelector(".track-embed", { timeout: 30000 });
  await page.screenshot({
    path: join(OUT, name),
    fullPage: true,
  });
}

async function captureBeforeReference(page: Page, name: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  const file = join(process.cwd(), "reports/sunday-nights/before-reference.html");
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await page.screenshot({ path: join(OUT, name), fullPage: false });
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "retroverse_ops_gate",
      value: "ok",
      domain: "localhost",
      path: "/",
    },
  ]);
  const page = await context.newPage();

  await captureBeforeReference(page, "before-mobile-top.png", { width: 390, height: 844 });
  await captureBeforeReference(page, "before-desktop-top.png", { width: 1280, height: 800 });

  await seedNowPlaying(page);

  await captureViewport(page, "after-mobile-top.png", { width: 390, height: 844 });
  await captureViewport(page, "after-desktop-top.png", { width: 1280, height: 800 });
  await captureFull(page, "after-mobile-full.png", { width: 390, height: 844 });
  await captureFull(page, "after-desktop-full.png", { width: 1280, height: 900 });

  await browser.close();
  console.log(`Screenshots saved to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
