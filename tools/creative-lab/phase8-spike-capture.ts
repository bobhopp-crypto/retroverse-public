/**
 * Phase 8C — first artwork generation spike verification.
 * Requires: RETROVERSE_OPS=1, OPENAI_API_KEY, dev server on CL_CAPTURE_BASE.
 * Usage: RETROVERSE_OPS=1 OPENAI_API_KEY=sk-... npx tsx tools/creative-lab/phase8-spike-capture.ts
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

import { creativeLabProjectGeneratedDir } from "../../lib/ops/creative-lab/paths";
import { retroverseDataRoot } from "../../lib/retroverse-data-root";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3001";
const OUT = join(process.cwd(), "reports/creative-lab");

async function fillDeskAndGenerateConcepts(page: import("playwright").Page) {
  await page.locator(".cl-desk__output-btn:has-text('PASS')").click();
  await page.fill('.cl-desk__field:has-text("Event") input', "Sunday Nights");
  await page.fill('.cl-desk__field:has-text("Venue") input', "Main Pub");
  await page.fill('.cl-desk__field:has-text("Date") input', "June 14, 2026");
  await page.locator('.cl-preset-ws:has-text("Sunday Nights Classic")').click();
  await page.locator('.cl-desk__artifact-btn:has-text("VIP PASS")').click();
  await page.locator('button:has-text("GENERATE CONCEPTS")').click();
  await page.waitForSelector(".cl-art-card", { timeout: 45000 });
}

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY required for Phase 8 spike verification");
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/creative-lab`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-desk", { timeout: 60000 });
  await fillDeskAndGenerateConcepts(page);

  await page.locator('button:has-text("USE THIS DIRECTION")').first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("GENERATE 8 REFINEMENTS")').click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("USE THIS VERSION")').first().click();
  await page.waitForTimeout(500);

  findings.push("workflow_to_variation: PASS");

  await page.locator('button:has-text("GENERATE ARTWORK")').click();
  await page.waitForSelector(".mc-notice", { timeout: 180000 });
  const notice = await page.locator(".mc-notice").first().textContent();
  findings.push(`artwork_notice: ${notice?.includes("Artwork generated") ? "PASS" : "FAIL"} (${notice})`);

  await page.screenshot({ path: join(OUT, "phase8-artwork-generated.png"), fullPage: true });

  await page.locator('button:has-text("Advanced Workshop")').click();
  await page.waitForSelector(".cl-workspace--advanced", { timeout: 30000 });
  await page.locator('button:has-text("Assets")').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "phase8-asset-library.png"), fullPage: true });

  const imgCount = await page.locator(".cl-asset-card__img").count();
  findings.push(`asset_library_images: ${imgCount >= 4 ? "PASS" : "FAIL"} (${imgCount})`);

  if (imgCount > 0) {
    await page.locator(".cl-asset-card__actions .ops-btn--ok").first().click();
    await page.waitForTimeout(600);
    await page.locator('.cl-asset-card select.ops-input').first().selectOption("final-front");
    await page.waitForTimeout(600);
    const finalLine = await page.locator(".cl-asset-library__finals li").first().textContent();
    findings.push(`set_final: ${finalLine && !finalLine.includes("—") ? "PASS" : "FAIL"}`);
  }

  await browser.close();

  const projectsRoot = join(retroverseDataRoot(), "creative_lab", "projects");
  let pngOnDisk = 0;
  if (existsSync(projectsRoot)) {
    for (const folder of readdirSync(projectsRoot)) {
      const genDir = creativeLabProjectGeneratedDir(folder);
      if (!existsSync(genDir)) continue;
      pngOnDisk += readdirSync(genDir).filter((f) => f.endsWith(".png")).length;
    }
  }
  findings.push(`png_files_on_disk: ${pngOnDisk >= 4 ? "PASS" : "FAIL"} (${pngOnDisk})`);

  writeFileSync(join(OUT, "phase8-spike-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
