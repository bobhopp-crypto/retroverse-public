/**
 * Verify Creative Lab Phase 6 — art-direction concept boards.
 * Usage: npx tsx tools/creative-lab/art-direction-capture.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/creative-lab");

async function fillDeskAndGenerate(page: import("playwright").Page) {
  await page.locator(".cl-desk__output-btn:has-text('PASS')").click();
  await page.fill('.cl-desk__field:has-text("Venue") input', "The Main Pub");
  await page.fill('.cl-desk__field:has-text("Date") input', "June 14, 2026");
  await page.locator('.cl-preset-ws:has-text("Sunday Nights Classic")').click();
  await page.locator('.cl-desk__artifact-btn:has-text("VIP PASS")').click();
  await page.locator('button:has-text("GENERATE CONCEPTS")').click();
  await page.waitForSelector(".cl-art-board__svg", { timeout: 45000 });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/creative-lab`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-desk", { timeout: 60000 });
  await fillDeskAndGenerate(page);
  await page.waitForTimeout(500);

  const artCards = await page.locator(".cl-art-card").count();
  findings.push(`four_art_direction_cards: ${artCards === 4 ? "PASS" : "FAIL"} (${artCards})`);

  const svgs = await page.locator(".cl-art-board__svg").count();
  findings.push(`illustrated_svg_boards: ${svgs >= 4 ? "PASS" : "FAIL"} (${svgs})`);

  const chips = await page.locator(".cl-art-card__chip").count();
  findings.push(`style_chips_present: ${chips >= 12 ? "PASS" : "FAIL"} (${chips})`);

  const noPromptBtn = await page.locator('button:has-text("View prompt")').count();
  findings.push(`no_prompt_in_main_flow: ${noPromptBtn === 0 ? "PASS" : "FAIL"}`);

  const noWorkflow = await page.locator(".cl-workflow-rounds").count();
  findings.push(`no_workflow_indicator: ${noWorkflow === 0 ? "PASS" : "FAIL"}`);

  const noAssetPipeline = await page.locator(".cl-asset-gen").count();
  findings.push(`no_asset_pipeline_main: ${noAssetPipeline === 0 ? "PASS" : "FAIL"}`);

  await page.screenshot({ path: join(OUT, "art-direction-round1.png"), fullPage: true });

  await page.locator('button:has-text("USE THIS DIRECTION")').first().click();
  await page.waitForTimeout(600);
  const refineCta = await page.locator(".cl-refine-cta").count();
  findings.push(`direction_refine_cta: ${refineCta > 0 ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "art-direction-winner-selected.png"), fullPage: false });

  await page.locator('button:has-text("GENERATE 8 REFINEMENTS")').click();
  await page.waitForTimeout(1000);
  const refineCards = await page.locator(".cl-art-card--refine").count();
  findings.push(`eight_refinements: ${refineCards === 8 ? "PASS" : "FAIL"} (${refineCards})`);
  await page.screenshot({ path: join(OUT, "art-direction-eight-refinements.png"), fullPage: true });

  await page.locator('button:has-text("USE THIS VERSION")').first().click();
  await page.waitForTimeout(800);
  const locked = await page.locator(".cl-art-winner").count();
  findings.push(`version_locked_banner: ${locked > 0 ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "art-direction-version-winner.png"), fullPage: false });

  await browser.close();

  writeFileSync(join(OUT, "art-direction-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
