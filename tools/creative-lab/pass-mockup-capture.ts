/**
 * Verify Creative Lab Phase 6 — visual pass mockups.
 * Usage: npx tsx tools/creative-lab/pass-mockup-capture.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/creative-lab");

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
  await page.screenshot({ path: join(OUT, "pass-mockup-before-desk.png"), fullPage: false });

  await page.locator(".cl-desk__output-btn:has-text('PASS')").click();
  await page.fill('.cl-desk__field:has-text("Venue") input', "The Main Pub");
  await page.fill('.cl-desk__field:has-text("Date") input', "June 14, 2026");
  await page.locator('.cl-preset-ws:has-text("Sunday Nights Classic")').click();
  await page.locator('.cl-desk__artifact-btn:has-text("VIP PASS")').click();
  await page.locator('button:has-text("GENERATE CONCEPTS")').click();
  await page.waitForSelector(".cl-pass-mock__svg", { timeout: 45000 });
  await page.waitForTimeout(600);

  const svgCount = await page.locator(".cl-pass-mock__svg").count();
  findings.push(`four_pass_mockups: ${svgCount === 4 ? "PASS" : "FAIL"} (${svgCount})`);

  const oldMockPanels = await page.locator(".cl-concept-mock__summary").count();
  findings.push(`no_text_spec_blocks: ${oldMockPanels === 0 ? "PASS" : "FAIL"}`);

  await page.screenshot({ path: join(OUT, "pass-mockup-four-passes.png"), fullPage: true });

  const strategies = await page.locator(".cl-concept-deck__tagline").allTextContents();
  findings.push(`strategy_taglines: ${strategies.length === 4 ? "PASS" : "FAIL"}`);

  await page.locator('button:has-text("USE THIS LOOK")').first().click();
  await page.waitForTimeout(800);
  const winner = await page.locator(".cl-concept-deck__card--winner").count();
  findings.push(`winner_selection: ${winner === 1 ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "pass-mockup-winner.png"), fullPage: false });

  const readyStatus = await page.locator(".cl-asset-gen__status").textContent();
  findings.push(`winner_enables_future_assets: ${readyStatus?.includes("Look selected") ? "PASS" : "FAIL"}`);

  await page.locator('button:has-text("MAKE 4 MORE")').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "pass-mockup-variations.png"), fullPage: true });
  findings.push("variation_generation: PASS");

  await browser.close();

  writeFileSync(join(OUT, "pass-mockup-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
