/**
 * Phase 9 — art direction overhaul verification.
 * Requires: RETROVERSE_OPS=1, OPENAI_API_KEY, dev server on CL_CAPTURE_BASE.
 * Usage: RETROVERSE_OPS=1 OPENAI_API_KEY=sk-... npx tsx tools/creative-lab/phase9-capture.ts
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

import { creativeLabProjectGeneratedDir } from "../../lib/ops/creative-lab/paths";
import { retroverseDataRoot } from "../../lib/retroverse-data-root";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3001";
const OUT = join(process.cwd(), "reports/creative-lab");

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY required for Phase 9 verification");
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
  await page.screenshot({ path: join(OUT, "phase9-before-workstation.png"), fullPage: true });

  await page.fill('.cl-desk__field:has-text("Event") input', "Sunday Nights");
  await page.fill('.cl-desk__field:has-text("Venue") input', "The Main Pub");
  await page.fill('.cl-desk__field:has-text("Date") input', "June 14, 2026");
  await page.locator('.cl-world-card:has-text("Psychedelic Festival")').click();
  await page.screenshot({ path: join(OUT, "phase9-world-selected.png"), fullPage: true });

  findings.push(`world_picker: ${(await page.locator(".cl-world-card--on").count()) === 1 ? "PASS" : "FAIL"}`);

  await page.locator('button:has-text("GENERATE PASSES")').click();
  await page.waitForSelector(".cl-pass-card__img", { timeout: 300000 });
  const conceptImages = await page.locator(".cl-pass-card__img").count();
  findings.push(`concept_images: ${conceptImages >= 4 ? "PASS" : "FAIL"} (${conceptImages})`);
  await page.screenshot({ path: join(OUT, "phase9-concepts-generated.png"), fullPage: true });

  await page.locator('button:has-text("USE THIS CONCEPT")').first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("GENERATE 8 VARIATIONS")').click();
  await page.waitForSelector(".cl-pass-deck__grid--refine .cl-pass-card__img", { timeout: 480000 });
  const refineImages = await page.locator(".cl-pass-deck__grid--refine .cl-pass-card__img").count();
  findings.push(`refinement_images: ${refineImages >= 8 ? "PASS" : "FAIL"} (${refineImages})`);
  await page.screenshot({ path: join(OUT, "phase9-variations-generated.png"), fullPage: true });

  await page.locator('button:has-text("Advanced Workshop")').click();
  await page.waitForSelector(".cl-workspace--advanced", { timeout: 30000 });
  await page.locator('button:has-text("Assets")').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "phase9-asset-library.png"), fullPage: true });

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
  findings.push(`png_files_on_disk: ${pngOnDisk >= 12 ? "PASS" : "FAIL"} (${pngOnDisk})`);

  writeFileSync(join(OUT, "phase9-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
