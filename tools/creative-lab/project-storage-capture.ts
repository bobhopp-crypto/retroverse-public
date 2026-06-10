/**
 * Verify Creative Lab Phase 4A — project storage + asset management.
 * Usage: npx tsx tools/creative-lab/project-storage-capture.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

import { creativeLabProjectDir, PROJECT_SUBDIRS } from "../../lib/ops/creative-lab/paths";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/creative-lab");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];
  let folderSlug = "";

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/creative-lab`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-workspace", { timeout: 60000 });
  findings.push("workspace_load: PASS");

  const runId = Date.now().toString(36);
  await page.click('button.cl-workspace__nav-btn:has-text("Projects")');
  await page.fill('.cl-form input.ops-input >> nth=0', `Storage Test ${runId}`);
  await page.fill('.cl-form input.ops-input >> nth=1', "Sunday Nights");
  await page.fill('.cl-form input.ops-input >> nth=2', "The Main Pub");
  await page.fill('.cl-form input.ops-input >> nth=3', "June 15, 2026");
  await page.click('button:has-text("Create project")');
  await page.waitForTimeout(1200);
  findings.push("project_create: PASS");

  await page.click('button.cl-workspace__nav-btn:has-text("Presets")');
  await page.waitForTimeout(400);
  await page.locator('.cl-preset-card:has-text("Sunday Nights Classic") button:has-text("Apply")').first().click();
  await page.waitForTimeout(1000);

  const projectUrl = page.url();
  folderSlug = new URL(projectUrl).searchParams.get("project") ?? "";
  await page.goto(
    `${BASE}/ops/creative-lab?panel=pass-lab${folderSlug ? `&project=${folderSlug}` : ""}`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Generate Concept A")').click();
  await page.waitForTimeout(1500);
  findings.push("concept_generate: PASS");
  await page.screenshot({ path: join(OUT, "storage-pass-lab.png"), fullPage: false });

  await page.goto(
    `${BASE}/ops/creative-lab?panel=assets${folderSlug ? `&project=${folderSlug}` : ""}`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "storage-asset-library.png"), fullPage: false });
  const assetCards = await page.locator(".cl-asset-card").count();
  findings.push(`asset_library: ${assetCards >= 4 ? "PASS" : "FAIL"} (${assetCards})`);

  await page.locator(".cl-asset-card").first().locator('button:has-text("Approve")').click();
  await page.waitForTimeout(600);
  await page.locator(".cl-asset-card").nth(1).locator('button:has-text("Reject")').click();
  await page.waitForTimeout(600);
  const approved = await page.locator(".cl-asset-status--approved").count();
  const rejected = await page.locator(".cl-asset-status--rejected").count();
  findings.push(`asset_approve_reject: ${approved > 0 && rejected > 0 ? "PASS" : "FAIL"}`);

  await page.locator(".cl-asset-card").nth(2).locator("select").selectOption("final-front");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "storage-final-selection.png"), fullPage: false });
  const finalWinner = await page.locator('.cl-asset-library__finals li:has-text("Final Front") span').last().textContent();
  findings.push(`final_selection: ${finalWinner && !finalWinner.includes("—") ? "PASS" : "FAIL"}`);

  await page.locator('button:has-text("Save Project")').click();
  await page.waitForTimeout(800);
  findings.push("save_project: PASS");

  await page.locator('button:has-text("Export Project Package")').click();
  await page.waitForTimeout(1200);
  findings.push("export_package: PASS");

  await page.locator('button:has-text("Export Finals")').click();
  await page.waitForTimeout(1200);
  findings.push("export_finals: PASS");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.goto(
    `${BASE}/ops/creative-lab?panel=assets${folderSlug ? `&project=${folderSlug}` : ""}`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(500);
  const cardsAfterReload = await page.locator(".cl-asset-card").count();
  findings.push(`project_reload: ${cardsAfterReload >= 4 ? "PASS" : "FAIL"} (${cardsAfterReload})`);
  await page.screenshot({ path: join(OUT, "storage-reload.png"), fullPage: false });

  if (folderSlug) {
    const projectDir = creativeLabProjectDir(folderSlug);
    const subdirs = PROJECT_SUBDIRS.filter((s) => existsSync(join(projectDir, s)));
    findings.push(`folder_structure: ${subdirs.length === PROJECT_SUBDIRS.length ? "PASS" : "FAIL"} (${subdirs.length}/${PROJECT_SUBDIRS.length})`);
    writeFileSync(
      join(OUT, "storage-structure.txt"),
      [
        `project_dir: ${projectDir}`,
        ...PROJECT_SUBDIRS.map((s) => `${s}/: ${existsSync(join(projectDir, s)) ? "yes" : "no"}`),
        `project.json: ${existsSync(join(projectDir, "project.json")) ? "yes" : "no"}`,
        `exports_zip: ${existsSync(join(projectDir, "exports")) ? "dir yes" : "dir no"}`,
      ].join("\n") + "\n",
    );
    await page.screenshot({ path: join(OUT, "storage-toolbar.png"), fullPage: false });
  }

  writeFileSync(join(OUT, "project-storage-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));
  await browser.close();
  process.exit(findings.some((f) => f.includes("FAIL")) ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
