import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

async function main() {
  const outDir = join(process.cwd(), "reports/passes");
  mkdirSync(outDir, { recursive: true });
  const base = process.env.PASS_GENERATOR_URL ?? "http://localhost:3000/ops/passes";

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });

  await page.context().addCookies([
    {
      name: "retroverse_ops_gate",
      value: "ok",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: "Generate pass sheet" }).click();
  await page.waitForSelector(".pass-sheet .pass-card", { timeout: 30000 });

  await page.screenshot({
    path: join(outDir, "pass-sheet-sample.png"),
    fullPage: true,
  });

  await browser.close();
  console.log(`Wrote screenshot → ${outDir}/pass-sheet-sample.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
