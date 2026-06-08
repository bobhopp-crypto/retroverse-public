/**
 * Capture Sunday Nights VIP pass section (desktop + mobile).
 * Usage: npx tsx tools/sunday-nights/capture-vip-pass.ts [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const baseUrl = process.argv[2]?.trim() || "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "reports/sunday-nights/vip-pass");
mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.goto(`${baseUrl}/sunday-nights`, { waitUntil: "networkidle" });
  await desktop.locator(".sn-pass").scrollIntoViewIfNeeded();
  await desktop.screenshot({
    path: join(outDir, "vip-pass-desktop-after.png"),
    fullPage: false,
  });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobile.goto(`${baseUrl}/sunday-nights`, { waitUntil: "networkidle" });
  await mobile.locator(".sn-pass").scrollIntoViewIfNeeded();
  await mobile.screenshot({
    path: join(outDir, "vip-pass-mobile-after.png"),
    fullPage: false,
  });

  await mobile.locator(".sn-pass__image-btn").click();
  await mobile.waitForSelector(".sn-pass__lightbox");
  await mobile.screenshot({
    path: join(outDir, "vip-pass-mobile-lightbox-after.png"),
    fullPage: false,
  });

  const errors: string[] = [];
  desktop.on("pageerror", (e) => errors.push(String(e)));
  mobile.on("pageerror", (e) => errors.push(String(e)));

  await browser.close();
  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        outDir,
        consoleErrors: errors,
        imageUrl: `${baseUrl}/sunday-nights/main-pub-vip-pass.png`,
      },
      null,
      2,
    ),
  );
}

void main();
