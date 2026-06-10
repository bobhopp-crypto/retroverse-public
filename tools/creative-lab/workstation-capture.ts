/**
 * Verify Creative Lab workstation UX reset.
 * Usage: npx tsx tools/creative-lab/workstation-capture.ts
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
  findings.push("workstation_landing: PASS");
  await page.screenshot({ path: join(OUT, "workstation-landing.png"), fullPage: false });

  const sidebarVisible = await page.locator(".cl-workspace__sidebar").count();
  findings.push(`no_admin_sidebar: ${sidebarVisible === 0 ? "PASS" : "FAIL"}`);

  await page.locator(".cl-desk__output-btn:has-text('PASS')").click();
  await page.fill('.cl-desk__field:has-text("Venue") input', "The Main Pub");
  await page.fill('.cl-desk__field:has-text("Date") input', "June 15, 2026");
  await page.locator('.cl-desk__preset-card:has-text("Sunday Nights Classic")').click();
  await page.screenshot({ path: join(OUT, "workstation-filled.png"), fullPage: false });
  findings.push("event_and_preset: PASS");

  await page.locator('button:has-text("GENERATE CONCEPTS")').click();
  await page.waitForSelector(".cl-concept-deck", { timeout: 30000 });
  await page.waitForTimeout(800);
  findings.push("concept_deck: PASS");
  await page.screenshot({ path: join(OUT, "workstation-concept-deck.png"), fullPage: true });

  const conceptCards = await page.locator(".cl-concept-deck__card").count();
  findings.push(`concept_card_count: ${conceptCards === 4 ? "PASS" : "FAIL"} (${conceptCards})`);

  const promptHidden = (await page.locator(".cl-concept-deck__prompt").count()) === 0;
  findings.push(`prompt_hidden_by_default: ${promptHidden ? "PASS" : "FAIL"}`);

  await page.locator('button:has-text("View prompt")').first().click();
  await page.waitForTimeout(300);
  const promptVisible = (await page.locator(".cl-concept-deck__prompt").count()) > 0;
  findings.push(`view_prompt_toggle: ${promptVisible ? "PASS" : "FAIL"}`);

  await page.locator('button:has-text("Advanced Workshop")').click();
  await page.waitForSelector(".cl-workspace--advanced", { timeout: 15000 });
  findings.push("advanced_workshop: PASS");
  await page.screenshot({ path: join(OUT, "workstation-advanced.png"), fullPage: false });

  await browser.close();

  const findingsPath = join(OUT, "workstation-findings.txt");
  writeFileSync(findingsPath, findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  const failed = findings.some((f) => f.includes("FAIL"));
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
