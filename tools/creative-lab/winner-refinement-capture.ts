/**
 * Verify Creative Lab Phase 7 — winner refinement workflow.
 * Usage: npx tsx tools/creative-lab/winner-refinement-capture.ts
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
  await page.waitForSelector(".cl-pass-mock__svg", { timeout: 45000 });
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

  const round1 = await page.locator(".cl-workflow-rounds__step--on").textContent();
  findings.push(`round1_indicator: ${round1?.includes("Concept Selection") ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "refinement-round1.png"), fullPage: true });

  await page.locator('button:has-text("USE THIS LOOK")').nth(1).click();
  await page.waitForTimeout(600);
  const refineCta = await page.locator(".cl-refine-cta").count();
  findings.push(`winner_shows_refine_cta: ${refineCta > 0 ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "refinement-winner-selected.png"), fullPage: false });

  await page.locator('button:has-text("GENERATE 8 VARIATIONS")').click();
  await page.waitForTimeout(1000);
  const refineCards = await page.locator(".cl-concept-deck__card--refine").count();
  findings.push(`eight_refinement_variants: ${refineCards === 8 ? "PASS" : "FAIL"} (${refineCards})`);

  const round2 = await page.locator(".cl-workflow-rounds__step--on").textContent();
  findings.push(`round2_indicator: ${round2?.includes("Variation Selection") ? "PASS" : "FAIL"}`);

  const inherit = await page.locator(".cl-concept-deck__inherit").textContent();
  findings.push(`inherits_concept_identity: ${inherit && inherit.length > 10 ? "PASS" : "FAIL"}`);

  await page.screenshot({ path: join(OUT, "refinement-eight-variants.png"), fullPage: true });

  await page.locator('button:has-text("USE THIS VARIATION")').first().click();
  await page.waitForTimeout(800);
  const round3Section = await page.locator(".cl-asset-gen").count();
  findings.push(`round3_asset_section: ${round3Section > 0 ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "refinement-variation-winner.png"), fullPage: false });

  const noMake4More = await page.locator('button:has-text("MAKE 4 MORE")').count();
  findings.push(`no_make_4_more: ${noMake4More === 0 ? "PASS" : "FAIL"}`);

  await browser.close();

  writeFileSync(join(OUT, "refinement-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
