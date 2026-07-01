import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

async function main() {
  const base = process.env.MC_BASE_URL || "http://localhost:3005";
  const out = join(process.cwd(), "reports/sprint-3.43-mission-control-screenshot.png");
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });

  await page.goto(`${base}/internal/ops-pin?next=${encodeURIComponent("/ops/studio")}`);
  await page.fill("#ops-pin", process.env.RETROVERSE_OPS_PIN || "6324");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/ops/studio**", { timeout: 30000 });
  await page.waitForSelector(".rs-mc", { timeout: 30000 });
  await page.waitForSelector("text=Sunday Night Progress", { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log("Wrote", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
