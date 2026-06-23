/**
 * Capture Artifact Studio screenshots for audit.
 * RETROVERSE_OPS=1 npx tsx tools/intelligence/capture-artifact-audit.ts
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/intelligence/artifact-audit");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const HOST = new URL(BASE).hostname;
const RVTR = process.env.RVTR ?? "RVTR285085";

const SHOTS = [
  { name: "studio-full", path: `/ops/intelligence/package/${RVTR}/artifacts`, fullPage: true },
  { name: "record-label", path: `/ops/intelligence/package/${RVTR}/artifacts`, selector: ".intel-artifact-render:nth-of-type(1)" },
  { name: "timeline", path: `/ops/intelligence/package/${RVTR}/artifacts`, selector: ".intel-artifact-render:nth-of-type(2)" },
  { name: "constellation", path: `/ops/intelligence/package/${RVTR}/artifacts`, selector: ".intel-artifact-render:nth-of-type(3)" },
  { name: "song-dna", path: `/ops/intelligence/package/${RVTR}/artifacts`, selector: ".intel-artifact-render:nth-of-type(4)" },
] as const;

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });

  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.context().addCookies([
      { name: "retroverse_ops_gate", value: "ok", domain: HOST, path: "/" },
    ]);
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".intel-artifact-render", { timeout: 30_000 });

    if ("selector" in shot && shot.selector) {
      const el = page.locator(shot.selector);
      await el.screenshot({ path: join(OUT, `${shot.name}.png`) });
    } else {
      await page.screenshot({ path: join(OUT, `${shot.name}.png`), fullPage: true });
    }

    console.log(`Wrote ${shot.name}.png`);
    await page.close();
  }

  await browser.close();
  console.log(`\nAudit screenshots: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
