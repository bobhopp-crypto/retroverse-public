/**
 * Verify Creative Lab Phase 3 — preset library + concept strategies.
 * Usage: npx tsx tools/creative-lab/preset-library-capture.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

import { buildConceptVariations } from "../../lib/ops/creative-lab/concept-variations";
import { BUILTIN_PRESET_LIBRARY, singleStyleSelection } from "../../lib/ops/creative-lab/preset-library";
import { syncBuiltinPresets, loadPreset } from "../../lib/ops/creative-lab/presets";
import type { CreativeLabProjectFile } from "../../lib/ops/creative-lab/types";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/creative-lab");

function linesOnlyIn(a: string, b: string): string[] {
  const setB = new Set(b.split("\n").map((l) => l.trim()));
  return a
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !setB.has(l));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];
  const reactWarnings: string[] = [];

  await syncBuiltinPresets();
  const samplePreset = await loadPreset("sunday-nights-classic");
  if (samplePreset) {
    writeFileSync(join(OUT, "preset-sample-sunday-nights-classic.json"), `${JSON.stringify(samplePreset, null, 2)}\n`);
  }

  const auditProject: CreativeLabProjectFile = {
    version: 1,
    id: "audit-preset",
    name: "Preset Audit",
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 15, 2026",
    featuredYears: [1967, 1978, 1992],
    theme: "Pub night nostalgia",
    styleSelection: singleStyleSelection(
      "festival-pass",
      "saturday-morning-cartoon",
      "cream-vintage",
      "detailed",
    ),
    activePresetId: "sunday-nights-classic",
    conceptStrategies: samplePreset?.conceptStrategies,
    generatedPrompts: [],
    generatedAssets: [],
    selectedAssetIds: [],
    activeModule: "pass-lab",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const variations = buildConceptVariations(auditProject, "pass-lab", samplePreset);
  writeFileSync(
    join(OUT, "concept-abcd-sunday-nights-classic.txt"),
    variations.map((p) => `--- Concept ${p.variationKey} (${p.strategyId}) ---\n${p.renderedPrompt}`).join("\n\n"),
  );

  const a = variations.find((p) => p.variationKey === "A")?.renderedPrompt ?? "";
  const b = variations.find((p) => p.variationKey === "B")?.renderedPrompt ?? "";
  const c = variations.find((p) => p.variationKey === "C")?.renderedPrompt ?? "";
  const d = variations.find((p) => p.variationKey === "D")?.renderedPrompt ?? "";
  const diffAB = linesOnlyIn(a, b).length;
  const diffAC = linesOnlyIn(a, c).length;
  const diffAD = linesOnlyIn(a, d).length;
  const strategyDiversity =
    diffAB > 8 && diffAC > 8 && diffAD > 8 && new Set(variations.map((p) => p.strategyId)).size === 4;
  findings.push(`concept_strategy_diversity: ${strategyDiversity ? "PASS" : "FAIL"} (diffs ${diffAB}/${diffAC}/${diffAD})`);

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => {
    const text = msg.text();
    if (/duplicate key|warning/i.test(text)) reactWarnings.push(text);
  });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/creative-lab?panel=presets`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-preset-gallery", { timeout: 60000 });
  const presetCards = await page.locator(".cl-preset-card").count();
  findings.push(`preset_gallery: ${presetCards >= 12 ? "PASS" : "FAIL"} (${presetCards})`);
  await page.screenshot({ path: join(OUT, "preset-gallery.png"), fullPage: false });

  await page.click('button.cl-workspace__nav-btn:has-text("Projects")');
  await page.waitForTimeout(300);
  const runId = Date.now().toString(36);
  await page.fill('.cl-form input.ops-input >> nth=0', `Preset Library Test ${runId}`);
  await page.fill('.cl-form input.ops-input >> nth=1', "Sunday Nights");
  await page.click('button:has-text("Create project")');
  await page.waitForTimeout(1200);

  await page.click('button.cl-workspace__nav-btn:has-text("Presets")');
  await page.waitForTimeout(400);
  await page.locator('.cl-preset-card:has-text("Sunday Nights Classic") button:has-text("Apply")').first().click();
  await page.waitForTimeout(1000);
  findings.push("preset_apply: PASS");
  await page.screenshot({ path: join(OUT, "preset-applied.png"), fullPage: false });

  await page.locator('.cl-preset-card:has-text("Music Bingo") button:has-text("Duplicate")').first().click();
  await page.waitForTimeout(1000);
  const dupVisible = await page.locator('.cl-preset-card:has-text("Music Bingo Copy")').count();
  findings.push(`preset_duplicate: ${dupVisible > 0 ? "PASS" : "FAIL"}`);

  await page.locator('.cl-preset-card:has-text("Collector Edition") button:has-text("Save as custom")').first().click();
  await page.waitForTimeout(1000);
  const customVisible = await page.locator('.cl-preset-card:has-text("Collector Edition Custom")').count();
  findings.push(`preset_save_custom: ${customVisible > 0 ? "PASS" : "FAIL"}`);

  const projectUrl = page.url();
  const projectParam = new URL(projectUrl).searchParams.get("project");
  await page.goto(
    `${BASE}/ops/creative-lab?panel=pass-lab${projectParam ? `&project=${projectParam}` : ""}`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(800);
  const genBtn = page.locator('button:has-text("Generate Concept")');
  await genBtn.waitFor({ state: "visible", timeout: 30000 });
  await genBtn.click();
  await page.waitForTimeout(1500);
  const tabs = await page.locator(".cl-concepts__tab").count();
  findings.push(`concept_tabs: ${tabs === 4 ? "PASS" : "FAIL"} (${tabs})`);
  await page.screenshot({ path: join(OUT, "preset-concept-variations.png"), fullPage: false });

  const tabTexts = await page.locator(".cl-concepts__tab").allTextContents();
  const uniqueStrategies = new Set(tabTexts.map((t) => t.split("·")[1]?.trim()).filter(Boolean));
  findings.push(`concept_tab_strategies: ${uniqueStrategies.size >= 3 ? "PASS" : "FAIL"} (${uniqueStrategies.size})`);

  findings.push(`builtin_count: ${BUILTIN_PRESET_LIBRARY.length}`);
  findings.push(`react_warnings: ${reactWarnings.length ? "FAIL" : "PASS"}`);

  writeFileSync(join(OUT, "preset-library-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  await browser.close();
  process.exit(findings.some((f) => f.includes("FAIL")) ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
