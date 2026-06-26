/**
 * Capture RV2 song + live pages for shell extraction regression check.
 * Run: npx tsx tools/capture-rv2-shell-step1.ts [before|after]
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const phase = process.argv[2] === "after" ? "after" : "before";
const OUT = join(process.cwd(), "reports/rv2-shell-step1", phase);
const BASE = process.env.RV2_CAPTURE_URL ?? "http://localhost:3000";
const SONG_PATH = process.env.RV2_CAPTURE_SONG ?? "/retroverse-2/song/RVTR417678";

async function capture(page: import("playwright").Page, path: string, outFile: string, fullPage: boolean) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector(".rv2-live__topbar", { timeout: 30_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: outFile, fullPage });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.route("**/api/sunday-nights/current", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        updatedAt: "capture-static",
        currentTrackId: null,
        channel: { running: false },
        live: null,
        track: null,
      }),
    });
  });

  await capture(page, SONG_PATH, join(OUT, "mobile-song-viewport.png"), false);
  await capture(page, SONG_PATH, join(OUT, "mobile-song.png"), true);
  await capture(page, "/retroverse-2/live", join(OUT, "mobile-live-viewport.png"), false);
  await capture(page, "/retroverse-2/live", join(OUT, "mobile-live.png"), true);

  await page.setViewportSize({ width: 1280, height: 900 });
  await capture(page, SONG_PATH, join(OUT, "desktop-song-viewport.png"), false);
  await capture(page, SONG_PATH, join(OUT, "desktop-song.png"), true);
  await capture(page, "/retroverse-2/live", join(OUT, "desktop-live-viewport.png"), false);
  await capture(page, "/retroverse-2/live", join(OUT, "desktop-live.png"), true);

  await browser.close();
  console.log(`Saved ${phase} screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
