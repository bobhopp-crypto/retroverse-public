/**
 * BobOS Cockpit v1 — browser verification (localhost only).
 * Usage: node tools/verify-bobos-cockpit-browser.mjs
 */
import { writeFile } from "fs/promises";
import { join } from "path";
import { chromium } from "playwright";

const BASE = process.env.COCKPIT_VERIFY_BASE ?? "http://localhost:3000";
const URL = `${BASE}/bobos`;

const results = [];

function pass(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });

  const title = await page.locator(".cockpit-title-plate__title").textContent();
  pass("Page loads with BobOS Cockpit title", title?.includes("BobOS Cockpit"), title ?? "");

  const gridCells = await page.locator(".cockpit-grid .cockpit-cell").count();
  pass("4x4 grid renders (16 cells)", gridCells === 16, `count=${gridCells}`);

  const wsButtons = await page.locator(".cockpit-switch").count();
  pass("Workspace switcher present", wsButtons === 8, `count=${wsButtons}`);

  // Switch to Development workspace (empty)
  await page.locator(".cockpit-switch", { hasText: "Development" }).click();
  await page.locator(".cockpit-switch--active", { hasText: "Development" }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  const emptyCells = await page.locator(".cockpit-cell--empty").count();
  pass("Development workspace shows empty cells", emptyCells === 16, `empty=${emptyCells}`);

  // Add Panel modal
  await page.locator(".cockpit-cell--empty").first().click();
  await page.waitForSelector(".cockpit-modal", { timeout: 5000 });
  pass("Add Panel modal opens", await page.locator(".cockpit-modal").isVisible());

  await page.locator(".cockpit-library-item", { hasText: "Alerts" }).click();
  await page.waitForTimeout(600);
  const alertsPanel = await page.locator(".cockpit-panel__title", { hasText: "Alerts" }).count();
  pass("Panel assigned from library", alertsPanel >= 1);

  // Switch back to Cockpit and verify seeded panels
  await page.locator(".cockpit-switch", { hasText: "Cockpit" }).click();
  await page.locator(".cockpit-switch--active", { hasText: "Cockpit" }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  const filledCells = await page.locator(".cockpit-cell--filled").count();
  pass("Cockpit workspace retains seeded panels", filledCells === 16, `filled=${filledCells}`);

  // Refresh persistence — switch to Development, refresh, check Alerts still there
  await page.locator(".cockpit-switch", { hasText: "Development" }).click();
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const alertsAfterReload = await page.locator(".cockpit-panel__title", { hasText: "Alerts" }).count();
  pass("Layout persists after refresh", alertsAfterReload >= 1);

  await browser.close();

  const outPath = join(process.cwd(), "tools/verify-bobos-cockpit-results.json");
  await writeFile(outPath, JSON.stringify({ url: URL, results, passed: results.every((r) => r.ok) }, null, 2));

  const allOk = results.every((r) => r.ok);
  if (!allOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
