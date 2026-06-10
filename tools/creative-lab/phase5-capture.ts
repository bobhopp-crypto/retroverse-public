/**
 * Verify Creative Lab Phase 5 — usability + visual communication.
 * Usage: npx tsx tools/creative-lab/phase5-capture.ts
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

  const eventVal = await page.locator('.cl-desk__field:has-text("Event") input').inputValue();
  const venueVal = await page.locator('.cl-desk__field:has-text("Venue") input').inputValue();
  const dateVal = await page.locator('.cl-desk__field:has-text("Date") input').inputValue();
  findings.push(
    `seeded_event: ${eventVal === "Sunday Nights" && venueVal === "The Main Pub" && dateVal === "June 14, 2026" ? "PASS" : "FAIL"}`,
  );

  const chipCount = await page.locator(".cl-year-tokens__chip").count();
  findings.push(`year_chips: ${chipCount === 3 ? "PASS" : "FAIL"} (${chipCount})`);
  await page.screenshot({ path: join(OUT, "phase5-seeded-desk.png"), fullPage: false });

  const presetCards = await page.locator(".cl-preset-ws").count();
  findings.push(`preset_visual_cards: ${presetCards >= 6 ? "PASS" : "FAIL"} (${presetCards})`);
  await page.screenshot({ path: join(OUT, "phase5-preset-cards.png"), fullPage: true });

  await page.locator('.cl-desk__artifact-btn:has-text("VIP PASS")').click();
  const readyText = await page.locator(".cl-desk__ready").textContent();
  findings.push(
    `selected_state: ${readyText?.includes("Sunday Nights Classic") && readyText?.includes("VIP Pass") ? "PASS" : "FAIL"}`,
  );
  await page.screenshot({ path: join(OUT, "phase5-artifact-selected.png"), fullPage: false });

  const armed = await page.locator(".cl-desk__generate-btn--armed").count();
  findings.push(`generate_armed: ${armed > 0 ? "PASS" : "FAIL"}`);

  await page.locator('button:has-text("GENERATE CONCEPTS")').click();
  await page.waitForSelector(".cl-concept-mock", { timeout: 30000 });
  await page.waitForTimeout(800);

  const mockPanels = await page.locator(".cl-concept-mock").count();
  findings.push(`concept_mock_panels: ${mockPanels === 4 ? "PASS" : "FAIL"} (${mockPanels})`);

  const influenceTags = await page.locator(".cl-concept-mock__influence").count();
  findings.push(`influence_tags: ${influenceTags > 0 ? "PASS" : "FAIL"} (${influenceTags})`);

  const assetPlaceholder = await page.locator(".cl-asset-gen").count();
  findings.push(`asset_gen_placeholder: ${assetPlaceholder > 0 ? "PASS" : "FAIL"}`);

  await page.screenshot({ path: join(OUT, "phase5-concept-deck.png"), fullPage: true });

  await page.locator('button:has-text("Advanced Workshop")').click();
  await page.waitForSelector(".cl-influence-lib", { timeout: 15000 });
  await page.locator(".cl-influence-lib summary").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, "phase5-influence-library.png"), fullPage: false });
  findings.push("influence_library_ui: PASS");

  await browser.close();

  writeFileSync(join(OUT, "phase5-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
