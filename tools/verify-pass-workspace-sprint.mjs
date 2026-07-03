/**
 * Browser verification for the Pass Workspace UX simplification sprint.
 *
 * Walks the full production workflow on a real project and captures screenshots:
 *   1. Event Information (simplified brief + live text preview)
 *   2. Artwork
 *   3. Production Layout
 *   4. Issue Passes (quantities, starting serial, estimated ranges)
 *   5. Review
 *   6. Print (grid choice remembered across reload)
 *
 * Usage: node tools/verify-pass-workspace-sprint.mjs [projectId]
 */

import { mkdir } from "fs/promises";
import { chromium } from "playwright";

const projectId = process.argv[2] ?? "f244eb49-9c60-4159-b1cd-50e5c5af5e5f";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const URL = `${BASE}/bobos/project/${projectId}/workspace/passes`;
const SHOTS = "tools/sprint-screenshots";

const results = [];
function pass(name) {
  results.push({ name, ok: true });
  console.log(`PASS — ${name}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`FAIL — ${name}${detail ? ` (${detail})` : ""}`);
}

await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 120_000 });
  pass("Opened Pass Workspace");

  // ── 1. Event Information ─────────────────────────────────────────────
  const brief = page.locator('section[aria-label="Event Information"]');
  await brief.waitFor({ timeout: 30_000 });
  pass("Section 1 — Event Information present");

  for (const label of ["Event", "Venue", "Date", "Style", "Color Scheme"]) {
    const count = await brief.locator("label", { hasText: label }).count();
    if (count > 0) pass(`Brief field "${label}" present`);
    else fail(`Brief field "${label}" missing`);
  }

  // No implementation terminology visible before opening Advanced.
  const briefText = await brief.innerText();
  if (/RVBR|prompt/i.test(briefText)) fail("Implementation terminology visible in brief", briefText.match(/RVBR|prompt/i)?.[0]);
  else pass("No RVBR/prompt terminology in default brief view");
  if (/Creative Notes/.test(briefText)) fail("Creative Notes visible without Advanced");
  else pass("Creative Notes hidden behind Advanced");

  // Live text preview updates as the user types.
  const eventInput = brief.locator("label", { hasText: "Event" }).first().locator("input");
  await eventInput.fill("Sprint Verify Night");
  await page.waitForTimeout(300);
  const headline = await page.locator(".pzw-text-preview__event").innerText();
  if (headline.toUpperCase().includes("SPRINT VERIFY NIGHT")) pass("Live preview headline updates from Event field");
  else fail("Live preview headline did not update", headline);

  const venueInput = brief.locator("label", { hasText: "Venue" }).first().locator("input");
  await venueInput.fill("The Verify Pub");
  await page.waitForTimeout(300);
  const secondary = await page.locator(".pzw-text-preview__venue").innerText();
  if (secondary.includes("The Verify Pub")) pass("Live preview secondary line updates from Venue field");
  else fail("Live preview secondary line did not update", secondary);

  await brief.screenshot({ path: `${SHOTS}/1-event-information.png` });

  // Advanced section reveals notes/era/toggles.
  await brief.getByRole("button", { name: "Advanced" }).click();
  await page.waitForTimeout(200);
  const advText = await brief.innerText();
  if (/creative notes/i.test(advText) && /\bera\b/i.test(advText)) pass("Advanced reveals Creative Notes + Era");
  else fail("Advanced section incomplete");
  await brief.screenshot({ path: `${SHOTS}/1b-advanced-open.png` });
  await brief.getByRole("button", { name: "Hide Advanced" }).click();

  // ── 2. Artwork ────────────────────────────────────────────────────────
  const artwork = page.locator('section[aria-label="Artwork"]');
  if ((await artwork.count()) > 0) pass("Section 2 — Artwork present");
  else fail("Artwork section missing");
  await artwork.screenshot({ path: `${SHOTS}/2-artwork.png` });

  // Quantity inputs must NOT be on artwork cards anymore.
  const cardQty = await page.locator(".pzw-artwork-card .pzw-qty").count();
  if (cardQty === 0) pass("Quantities moved off artwork cards");
  else fail("Quantity inputs still on artwork cards");

  // ── 3. Production Layout ─────────────────────────────────────────────
  const prod = page.locator(".pzw-prod");
  await prod.scrollIntoViewIfNeeded();
  const prodTitle = await prod.locator(".pzw-prod__title").innerText();
  if (prodTitle.includes("3") && prodTitle.includes("Production Layout")) pass("Section 3 — Production Layout numbered");
  else fail("Production Layout title wrong", prodTitle);
  await page.waitForTimeout(2500); // let the composited preview load
  await prod.screenshot({ path: `${SHOTS}/3-production-layout.png` });

  // ── 4. Issue Passes ──────────────────────────────────────────────────
  const issue = page.locator('section[aria-label="Issue Passes"]');
  await issue.scrollIntoViewIfNeeded();
  if ((await issue.count()) > 0) pass("Section 4 — Issue Passes present");
  else fail("Issue Passes section missing");

  const bodyText = await page.locator("body").innerText();
  if (/Generate Batch/.test(bodyText)) fail('"Generate Batch" label still visible');
  else pass('"Generate Batch" renamed to "Issue Passes"');

  // Per-type quantities.
  async function setQty(label, value) {
    const input = issue.locator(".pzw-issue__qty", { hasText: label }).locator("input");
    await input.fill(String(value));
  }
  await setQty("General", 2);
  await setQty("VIP", 1);
  await setQty("Backstage", 1);
  await page.waitForTimeout(300);

  // Estimated serial ranges per type.
  const rangesText = await issue.locator(".pzw-issue__ranges").innerText();
  if (/General/.test(rangesText) && /VIP/.test(rangesText) && /Backstage/.test(rangesText) && /\d{4}–\d{4}/.test(rangesText)) {
    pass(`Estimated serial ranges shown (${rangesText.replace(/\s+/g, " ").trim()})`);
  } else fail("Estimated serial ranges missing", rangesText);

  // Starting serial radios.
  const nextRadio = issue.locator(".pzw-issue__radio", { hasText: "Continue from Next Available" });
  const customRadio = issue.locator(".pzw-issue__radio", { hasText: "Custom Starting Serial" });
  if ((await nextRadio.count()) > 0 && (await customRadio.count()) > 0) pass("Starting Serial choices present");
  else fail("Starting Serial radios missing");

  await customRadio.locator("input").check();
  await page.waitForTimeout(200);
  const customInput = issue.locator(".pzw-issue__custom-start");
  if ((await customInput.count()) > 0) pass("Custom starting serial input appears");
  else fail("Custom starting serial input missing");
  await customInput.fill("9000");
  await page.waitForTimeout(300);
  const customRanges = await issue.locator(".pzw-issue__ranges").innerText();
  if (/9000/.test(customRanges)) pass("Estimated range follows custom starting serial");
  else fail("Estimated range ignores custom start", customRanges);
  await issue.screenshot({ path: `${SHOTS}/4b-issue-custom-serial.png` });

  await nextRadio.locator("input").check();
  await page.waitForTimeout(300);
  await issue.screenshot({ path: `${SHOTS}/4-issue-passes.png` });

  // Issue the passes.
  const issueBtn = issue.getByRole("button", { name: /^Issue Passes$/ });
  if (await issueBtn.isEnabled()) {
    await issueBtn.click();
    pass("Clicked Issue Passes");
    await page.waitForSelector(".pzw-preview__meta", { timeout: 180_000 });
    pass("Issued passes appear in Review");
  } else {
    fail("Issue Passes button disabled", await issue.innerText());
  }

  // ── 5. Review ─────────────────────────────────────────────────────────
  const review = page.locator("section", { hasText: "5 · Review" }).last();
  await review.scrollIntoViewIfNeeded();
  const meta = await page.locator(".pzw-preview__meta").innerText();
  if (/Serial \d{4}/.test(meta)) pass(`Review shows pass identity (${meta})`);
  else fail("Review missing serial identity", meta);
  await page.waitForTimeout(1500);
  await review.screenshot({ path: `${SHOTS}/5-review.png` });

  // ── 6. Print ──────────────────────────────────────────────────────────
  const print = page.locator('section[aria-label="Print"]');
  await print.scrollIntoViewIfNeeded();
  if ((await print.count()) > 0) pass("Section 6 — Print present");
  else fail("Print section missing");

  const gridSelect = print.locator("select");
  const options = await gridSelect.locator("option").allInnerTexts();
  const hasGrids = ["2 × 2", "3 × 3", "4 × 4", "Auto Best Fit"].every((g) => options.some((o) => o.includes(g)));
  if (hasGrids) pass("Print grids 2×2 / 3×3 / 4×4 / Auto available");
  else fail("Print grid options incomplete", options.join(", "));

  await gridSelect.selectOption("2x2");
  await page.waitForTimeout(600); // debounce save
  await print.getByRole("button", { name: /Build Print Sheets|Rebuild Print Sheets/ }).click();
  await page.waitForSelector(".pzw-sheets__image", { timeout: 180_000 });
  pass("Print sheets built and displayed");
  await print.screenshot({ path: `${SHOTS}/6-print.png` });
  await page
    .locator('section[aria-label="Print sheets"]')
    .screenshot({ path: `${SHOTS}/6b-print-sheets.png` });

  // Grid choice remembered across reload.
  await page.reload({ waitUntil: "networkidle" });
  const remembered = await page.locator('section[aria-label="Print"] select').inputValue();
  if (remembered === "2x2") pass("Print grid choice remembered after reload");
  else fail("Print grid not remembered", remembered);

  // Full-page terminology sweep.
  const fullText = await page.locator("body").innerText();
  if (/RVBR/.test(fullText)) fail("RVBR visible somewhere on the page");
  else pass("No RVBR terminology anywhere on the page");

  await page.screenshot({ path: `${SHOTS}/0-full-workflow.png`, fullPage: true });
} catch (err) {
  fail("Unexpected error", err.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
