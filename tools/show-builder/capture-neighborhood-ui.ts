import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/show-builder/neighborhood-experiment/screenshots");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  for (const year of [1967, 1978, 1992]) {
    await page.goto("http://localhost:3000/ops/show-builder?neighbors=1", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.waitForSelector(".ops-show__neighbors", { timeout: 120000 });
    await page.click(`.ops-show__year-tab:has-text("${year}")`);
    await page.waitForTimeout(500);

    const pick =
      year === 1967
        ? "Happy Together"
        : year === 1978
          ? "Le Freak"
          : "Baby Got Back";
    await page.click(`.ops-show__neighbor-pick:has-text("${pick}")`);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: join(OUT, `neighbors-${year}.png`),
      fullPage: true,
    });
    console.log("captured", year);
  }

  await browser.close();
  console.log("Saved to", OUT);
}

void main();
