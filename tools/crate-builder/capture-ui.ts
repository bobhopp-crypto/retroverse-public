import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

async function main() {
  const outDir = join(process.cwd(), "reports/crate-builder");
  mkdirSync(outDir, { recursive: true });
  const base = process.env.CRATE_BUILDER_URL ?? "http://localhost:3000/ops/crate-builder?year=1967";

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  await page.context().addCookies([
    {
      name: "retroverse_ops_gate",
      value: "ok",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".ops-crate__pile-body .ops-crate__card", { timeout: 120000 });

  await page.screenshot({
    path: join(outDir, "crate-builder-deal-b-1967.png"),
    fullPage: true,
  });

  for (const year of [1978, 1992]) {
    await page.locator(`.ops-crate__year:has-text("${year}")`).click();
    await page.waitForSelector(".ops-crate__pile-body .ops-crate__card", { timeout: 60000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: join(outDir, `crate-builder-deal-b-${year}.png`),
      fullPage: true,
    });
  }

  await browser.close();
  console.log(`Wrote screenshots → ${outDir}/crate-builder-deal-b-*.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
