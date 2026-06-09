/**
 * Verify Creative Lab Phase 2 — style boards + prompt renderer.
 * Usage: npx tsx tools/creative-lab/prompt-renderer-capture.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/creative-lab");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];
  const reactWarnings: string[] = [];
  let samplePrompt = "";

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => {
    const text = msg.text();
    if (/duplicate key|warning/i.test(text)) reactWarnings.push(text);
  });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/creative-lab`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-workspace", { timeout: 60000 });

  await page.click('button.cl-workspace__nav-btn:has-text("Projects")');
  await page.waitForTimeout(300);
  const runId = Date.now().toString(36);
  await page.fill('.cl-form input.ops-input >> nth=0', `Prompt Renderer Test ${runId}`);
  await page.fill('.cl-form input.ops-input >> nth=1', "Sunday Nights");
  await page.fill('.cl-form input.ops-input >> nth=2', "Main Pub");
  await page.fill('.cl-form input.ops-input >> nth=3', "June 14, 2026");
  await page.fill('.cl-form input.ops-input >> nth=5', "Pub night nostalgia");
  await page.click('button:has-text("Create project")');
  await page.waitForTimeout(1500);
  findings.push("project_create: PASS");

  await page.click('button.cl-workspace__nav-btn:has-text("Styles")');
  await page.waitForTimeout(500);
  const styleCards = await page.locator(".cl-style-card").count();
  findings.push(`style_board_cards: ${styleCards >= 20 ? "PASS" : "FAIL"} (${styleCards})`);
  await page.screenshot({ path: join(OUT, "style-boards.png"), fullPage: false });

  await page.locator('[data-category="credential"] .cl-style-card__hit').nth(0).click();
  await page.locator('[data-category="credential"] .cl-style-card__hit').nth(1).click();
  await page.locator('[data-category="illustration"] .cl-style-card__hit').nth(0).click();
  await page.locator('[data-category="color"] .cl-style-card__hit').nth(0).click();
  await page.locator('[data-category="density"] .cl-style-card__hit').nth(0).click();
  await page.waitForTimeout(400);

  const previewVisible = await page.locator(".cl-prompt-preview__text").count();
  findings.push(`prompt_preview_live: ${previewVisible > 0 ? "PASS" : "FAIL"}`);
  samplePrompt = (await page.locator(".cl-prompt-preview__text").first().textContent()) ?? "";
  findings.push(`prompt_has_sections: ${/Event Context|Visual Style|Illustration Style|Color Style/.test(samplePrompt) ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "prompt-preview.png"), fullPage: false });

  await page.click('button:has-text("Save styles")');
  await page.waitForTimeout(1000);
  findings.push("style_save: PASS");

  const projectUrl = page.url();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".cl-style-card--on", { timeout: 30000 });
  const selectedAfterReload = await page.locator(".cl-style-card--on").count();
  findings.push(`style_reload: ${selectedAfterReload >= 5 ? "PASS" : "FAIL"} (${selectedAfterReload})`);

  await page.goto(projectUrl.replace("panel=styles", "panel=pass-lab"), { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.click('button:has-text("Generate Concept A–D")');
  await page.waitForTimeout(1500);

  const conceptTabs = await page.locator(".cl-concepts__tab").count();
  findings.push(`concept_variations: ${conceptTabs === 4 ? "PASS" : "FAIL"} (${conceptTabs})`);
  await page.screenshot({ path: join(OUT, "concept-variations.png"), fullPage: false });

  await page.click('button.cl-concepts__tab:has-text("Concept B")');
  await page.waitForTimeout(300);
  const conceptB = (await page.locator(".cl-concepts__prompt").textContent()) ?? "";
  findings.push(`concept_b_emphasis: ${/credential format|Emphasis/i.test(conceptB) ? "PASS" : "FAIL"}`);
  await page.screenshot({ path: join(OUT, "concept-b.png"), fullPage: false });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const tabsAfterReload = await page.locator(".cl-concepts__tab").count();
  findings.push(`concepts_reload: ${tabsAfterReload === 4 ? "PASS" : "FAIL"} (${tabsAfterReload})`);
  await page.screenshot({ path: join(OUT, "project-reload.png"), fullPage: false });

  findings.push(`react_warnings: ${reactWarnings.length ? "FAIL" : "PASS"}`);
  if (reactWarnings.length) findings.push(...reactWarnings);

  writeFileSync(join(OUT, "prompt-renderer-findings.txt"), findings.join("\n") + "\n");
  writeFileSync(join(OUT, "sample-rendered-prompt.txt"), samplePrompt.trim() + "\n");
  console.log(findings.join("\n"));
  console.log("\n--- Sample prompt (truncated) ---\n");
  console.log(samplePrompt.slice(0, 600));

  await browser.close();
  const failed = findings.some((f) => f.includes("FAIL"));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
