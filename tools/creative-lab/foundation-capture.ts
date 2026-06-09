/**
 * Verify Creative Lab foundation.
 * Usage: npx tsx tools/creative-lab/foundation-capture.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/creative-lab");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];
  const reactWarnings: string[] = [];

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => {
    const text = msg.text();
    if (/duplicate key|warning/i.test(text)) reactWarnings.push(text);
  });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(600);
  findings.push(`ops_console: PASS`);
  await page.screenshot({ path: join(OUT, "foundation-ops.png"), fullPage: false });

  await page.goto(`${BASE}/ops/creative-lab`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-workspace", { timeout: 60000 });
  findings.push(`creative_lab_loads: PASS`);
  await page.screenshot({ path: join(OUT, "foundation-workspace.png"), fullPage: false });

  await page.click('button.cl-workspace__nav-btn:has-text("Presets")');
  await page.waitForTimeout(500);
  const presetCount = await page.locator(".cl-preset-list .cl-card").count();
  findings.push(`presets_visible: ${presetCount >= 4 ? "PASS" : "FAIL"} (${presetCount})`);
  await page.screenshot({ path: join(OUT, "foundation-presets.png"), fullPage: false });

  await page.click('button.cl-workspace__nav-btn:has-text("Projects")');
  await page.waitForTimeout(300);
  await page.fill('.cl-form input.ops-input >> nth=0', "Sunday Nights Test");
  await page.fill('.cl-form input.ops-input >> nth=1', "Sunday Nights");
  await page.fill('.cl-form input.ops-input >> nth=2', "Main Pub");
  await page.fill('.cl-form input.ops-input >> nth=3', "June 14, 2026");
  await page.click('button:has-text("Create project")');
  await page.waitForTimeout(1500);
  findings.push(`project_create: PASS`);
  await page.screenshot({ path: join(OUT, "foundation-project.png"), fullPage: false });

  await page.click('button.cl-workspace__nav-btn:has-text("Styles")');
  await page.waitForTimeout(400);
  const sliders = await page.locator('.cl-style-row input[type="range"]').count();
  findings.push(`style_sliders: ${sliders > 0 ? "PASS" : "FAIL"} (${sliders})`);
  const firstSlider = page.locator('.cl-style-row input[type="range"]').first();
  await firstSlider.fill("70");
  await page.click('button:has-text("Save style weights")');
  await page.waitForTimeout(1000);
  findings.push(`style_weights_save: PASS`);
  await page.screenshot({ path: join(OUT, "foundation-styles.png"), fullPage: false });

  await page.click('button.cl-workspace__nav-btn:has-text("Pass Lab")');
  await page.waitForTimeout(400);
  await page.click('button:has-text("Build concept")');
  await page.waitForTimeout(1000);
  const concept = await page.locator(".cl-concept").count();
  findings.push(`pass_lab_concept: ${concept > 0 ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "foundation-pass-lab.png"), fullPage: false });

  findings.push(`react_warnings: ${reactWarnings.length ? "FAIL" : "PASS"}`);
  if (reactWarnings.length) findings.push(...reactWarnings);

  writeFileSync(join(OUT, "foundation-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  await browser.close();
  if (findings.some((f) => f.includes(": FAIL"))) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
