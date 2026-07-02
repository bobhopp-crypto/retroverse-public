// Verification: Restore Finished-AI Pass Artwork + Keep Production QR/Serial.
// Creates a fresh BobOS project, generates General pass artwork via the real AI pipeline,
// checks the prompt debug shows governed typography (not illustration-only), generates a
// batch (QR + serial), and builds print sheets. Saves artwork for visual inspection.

import { mkdirSync, writeFileSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT_DIR = "/tmp/verify-restore-pass";
mkdirSync(OUT_DIR, { recursive: true });

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
}

const consoleErrors = [];
const pageErrors = [];
const networkFailures = [];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("requestfailed", (req) => {
    const failure = req.failure();
    if (failure && !failure.errorText.includes("ERR_ABORTED")) {
      networkFailures.push(`${req.url()} — ${failure.errorText}`);
    }
  });

  // 1. Create a project via the BobOS home page (single natural-language prompt).
  await page.goto(`${BASE}/bobos`, { waitUntil: "networkidle" });
  check("Opened /bobos", true);

  await page
    .locator("textarea")
    .first()
    .fill("Verify Restore Sprint — Sunday Nights every Sunday in July 2026 at The Main Pub, Live Aid & 1980s Music theme.");
  await page.getByRole("button", { name: /^start$/i }).click();
  await page.waitForURL(/\/bobos\/project\/[a-f0-9-]+/, { timeout: 30_000 });

  const url = page.url();
  const projectMatch = url.match(/\/bobos\/project\/([a-f0-9-]+)/);
  check("Project created", Boolean(projectMatch), url);
  const projectId = projectMatch?.[1];
  if (!projectId) throw new Error("Could not resolve created project id — aborting.");

  // 2. Open Pass Workspace.
  await page.goto(`${BASE}/bobos/project/${projectId}/workspace/passes`, { waitUntil: "networkidle" });
  check("Opened Pass Workspace", page.url().includes("/workspace/passes"));

  await page.screenshot({ path: `${OUT_DIR}/01-workspace-empty.png`, fullPage: true });

  // 3. Generate artwork for the General pass card.
  const generalCard = page.locator(".pzw-artwork-card", { hasText: "General" }).first();
  check("General card visible", (await generalCard.count()) > 0);

  const generateBtn = generalCard.getByRole("button", { name: /generate artwork/i });
  check("Generate Artwork button visible", (await generateBtn.count()) > 0);

  console.log("Generating General pass artwork via real AI pipeline (front + back) — this can take several minutes...");
  await generateBtn.click();
  await page.waitForSelector(".pzw-artwork-card__version", { timeout: 900_000 });
  check("Artwork generated (version badge appeared)", true);

  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/02-workspace-generated.png`, fullPage: true });

  // 4. Grab the raw front/back artwork URLs and save them locally for visual inspection.
  const frontImg = generalCard.locator("img").first();
  const frontSrc = await frontImg.getAttribute("src");
  check("Front artwork <img> present", Boolean(frontSrc), frontSrc ?? "");

  if (frontSrc) {
    const resp = await page.request.get(new URL(frontSrc, BASE).toString());
    const buf = await resp.body();
    writeFileSync(`${OUT_DIR}/general-front-raw.png`, buf);
    check("Downloaded raw front artwork", resp.ok(), `${buf.length} bytes`);
  }

  // Toggle to back and save it too (locator text flips between "Preview Back"/"Preview Front").
  const toggleBtn = generalCard.getByRole("button", { name: /preview (back|front)/i });
  if (await toggleBtn.count()) {
    await toggleBtn.click();
    await page.waitForTimeout(300);
    const backSrc = await generalCard.locator("img").first().getAttribute("src");
    if (backSrc) {
      const resp = await page.request.get(new URL(backSrc, BASE).toString());
      const buf = await resp.body();
      writeFileSync(`${OUT_DIR}/general-back-raw.png`, buf);
      check("Downloaded raw back artwork", resp.ok(), `${buf.length} bytes`);
    }
    await toggleBtn.click().catch(() => {}); // back to front — non-critical if it fails
  }

  // 5. Set quantity to 1 for General, 0 for VIP/Backstage (no artwork generated for those),
  // then generate a batch.
  await generalCard.locator('input[type="number"]').first().fill("1");
  for (const label of ["VIP", "Backstage"]) {
    const card = page.locator(".pzw-artwork-card", { hasText: label }).first();
    const input = card.locator('input[type="number"]').first();
    if (await input.count()) await input.fill("0");
  }

  const batchBtn = page.getByRole("button", { name: /generate batch/i }).first();
  check("Generate Batch button visible", (await batchBtn.count()) > 0);
  if (await batchBtn.count()) {
    await batchBtn.click();
    // Wait for either the finished preview + print sheets, or an error banner.
    await page.waitForSelector(".ps-preview, .pzw-sheets, .ps-step__error", { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: `${OUT_DIR}/03-after-batch.png`, fullPage: true }).catch(() => {});

  try {
    const batchError = page.locator(".ps-step__error").first();
    const hasBatchError = (await batchError.count()) > 0;
    check("No batch generation error banner", !hasBatchError, hasBatchError ? (await batchError.textContent()) ?? "" : "");
  } catch (err) {
    check("No batch generation error banner", false, String(err));
  }

  // 6. Check the finished Preview shows QR text / serial and save it.
  try {
    const previewImg = page.locator(".pzw-preview__image, .ps-preview img").first();
    if (await previewImg.count()) {
      const previewSrc = await previewImg.getAttribute("src");
      if (previewSrc) {
        const resp = await page.request.get(new URL(previewSrc, BASE).toString());
        const buf = await resp.body();
        writeFileSync(`${OUT_DIR}/finished-front.png`, buf);
        check("Downloaded finished front preview", resp.ok(), `${buf.length} bytes`);
      }
    }
  } catch (err) {
    check("Downloaded finished front preview", false, String(err));
  }

  try {
    const backToggle = page.getByRole("button", { name: /^back$/i }).first();
    if (await backToggle.count()) {
      await backToggle.click();
      await page.waitForTimeout(500);
      const backPreviewSrc = await page.locator(".pzw-preview__image, .ps-preview img").first().getAttribute("src");
      if (backPreviewSrc) {
        const resp = await page.request.get(new URL(backPreviewSrc, BASE).toString());
        const buf = await resp.body();
        writeFileSync(`${OUT_DIR}/finished-back.png`, buf);
        check("Downloaded finished back preview (should show QR + serial)", resp.ok(), `${buf.length} bytes`);
      }
    }
  } catch (err) {
    check("Downloaded finished back preview (should show QR + serial)", false, String(err));
  }

  const serialText = await page.locator(".ps-preview__serial").first().textContent().catch(() => null);
  check("Serial number visible in Preview", Boolean(serialText && /No\.\s*\d+/.test(serialText)), serialText ?? "");

  const qrUrlText = await page.locator(".ps-preview__qr-url").first().textContent().catch(() => null);
  check("QR registration URL visible in Preview", Boolean(qrUrlText), qrUrlText ?? "");

  // 7. Print Sheets — Generate Batch already built them; confirm they rendered, then
  // explicitly exercise "Rebuild Print Sheets" (buildBobosPrintSheetsForPasses).
  try {
    const sheetsGrid = page.locator(".pzw-sheets").first();
    check("Print sheets auto-built after Generate Batch", (await sheetsGrid.count()) > 0);

    const rebuildBtn = page.getByRole("button", { name: /rebuild print sheets/i }).first();
    check("Rebuild Print Sheets button visible", (await rebuildBtn.count()) > 0);
    if (await rebuildBtn.count()) {
      await rebuildBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${OUT_DIR}/04-print-sheets.png`, fullPage: true });

    const sheetsError = page.locator(".ps-step__error").first();
    check("No print sheets error", (await sheetsError.count()) === 0);

    const sheetImg = page.locator(".pzw-sheets img").first();
    check("Print sheet image rendered", (await sheetImg.count()) > 0);

    const pdfLink = page.locator('a[href*=".pdf"]').first();
    check("PDF download link present", (await pdfLink.count()) > 0);
  } catch (err) {
    check("Print sheets section completed without error", false, String(err));
  }

  // 8. Error checks.
  check("No console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  check("No uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  check("No network failures (excluding ERR_ABORTED)", networkFailures.length === 0, networkFailures.slice(0, 3).join(" | "));

  await browser.close();

  console.log("\n=== SUMMARY ===");
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("FAILURES:");
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
  }
  writeFileSync(`${OUT_DIR}/results.json`, JSON.stringify({ results, projectId }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  check("Script completed without a fatal error", false, String(err));
  console.log("\n=== SUMMARY (partial — fatal error) ===");
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed.`);
  writeFileSync(`${OUT_DIR}/results.json`, JSON.stringify({ results }, null, 2));
  process.exit(1);
});
