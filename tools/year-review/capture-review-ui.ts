import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

async function main() {
  const outDir = join(process.cwd(), "reports/review-universe/screenshots");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.context().addCookies([
    {
      name: "retroverse_ops_gate",
      value: "ok",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("http://localhost:3000/ops/year/1967", { waitUntil: "networkidle" });
  await page.waitForSelector(".ops-ru-headline", { timeout: 30000 });
  await page.screenshot({
    path: join(outDir, "1967-review-overview.png"),
    fullPage: false,
  });

  await page.click('button:has-text("Needs Review")');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(outDir, "1967-needs-review-filter.png"),
    fullPage: false,
  });

  const card = page.locator(".ops-ru-card").first();
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: join(outDir, "1967-card-detail.png"),
    clip: await card.boundingBox().then((b) =>
      b
        ? {
            x: Math.max(0, b.x - 8),
            y: Math.max(0, b.y - 8),
            width: Math.min(1440, b.width + 16),
            height: Math.min(900, b.height + 16),
          }
        : undefined,
    ),
  });

  const bridgeCard = page.locator(".ops-ru-card--has-bridge").first();
  if ((await bridgeCard.count()) > 0) {
    await bridgeCard.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(outDir, "1967-bridge-card.png"),
      clip: await bridgeCard.boundingBox().then((b) =>
        b
          ? {
              x: Math.max(0, b.x - 8),
              y: Math.max(0, b.y - 8),
              width: Math.min(1440, b.width + 16),
              height: Math.min(900, b.height + 16),
            }
          : undefined,
      ),
    });
  }

  await browser.close();
  console.log("Saved screenshots to", outDir);
}

void main();
