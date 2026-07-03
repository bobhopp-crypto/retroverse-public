import { chromium } from "playwright";
import { readFile } from "fs/promises";
import { join } from "path";

const BASE = "http://localhost:3000";
const DATA_ROOT = process.env.RETROVERSE_DATA_ROOT || "/Users/bobhopp/RETROVERSE_DATA";

function pass(msg) { console.log(`PASS — ${msg}`); }
function fail(msg) { console.log(`FAIL — ${msg}`); process.exitCode = 1; }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

try {
  // 1. Create a project through the BobOS API (same endpoint the home form posts to).
  const res = await fetch(`${BASE}/api/bobos/project-zero/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "I'm running a Sunday night 80s event at The Main Pub in July" }),
  });
  const { project } = await res.json();
  if (!project?.id) throw new Error("Project creation API failed");
  const projectId = project.id;
  const projectUrl = `${BASE}/bobos/project/${projectId}`;
  pass(`Project created (${projectId})`);
  await page.goto(projectUrl, { waitUntil: "domcontentloaded" });

  // Series row visible on project dashboard.
  const dashText = await page.locator(".pz-project__context-grid").innerText();
  if (dashText.toUpperCase().includes("SERIES")) pass("Project dashboard shows Series in Shared Context");
  else fail("Project dashboard missing Series");

  // 2. Click into the Pass Workspace. Wait for hydration before typing into fields.
  await page.goto(`${projectUrl}/workspace/passes`, { waitUntil: "networkidle" });
  await page.waitForSelector(".pzw-brief", { timeout: 15000 });
  await page.waitForTimeout(1000);
  pass("Pass Workspace opened with Creative Brief panel");

  // 3. Verify pre-filled fields from Shared Context.
  const eventVal = await page.locator(".pzw-brief__field:has(> span:text-is('Event')) input").inputValue();
  const dateVal = await page.locator(".pzw-brief__field:has(> span:text-is('Date')) input").inputValue();
  if (eventVal.length > 0) pass(`Event pre-filled from project title: "${eventVal}"`);
  else fail("Event field not pre-filled");
  if (dateVal.toLowerCase().includes("july")) pass(`Date pre-filled: "${dateVal}"`);
  else fail(`Date not pre-filled (got "${dateVal}")`);

  // RVBR style selector populated with eras.
  const eraOptions = await page.locator(".pzw-brief__field:has(> span:text-is('RVBR Style')) select option").count();
  if (eraOptions > 1) pass(`RVBR Style selector populated (${eraOptions} eras)`);
  else fail(`RVBR Style selector has ${eraOptions} option(s)`);
  const eraValue = await page.locator(".pzw-brief__field:has(> span:text-is('RVBR Style')) select").inputValue();
  if (eraValue === "1982-1985") pass("Default RVBR style is 1982-1985");
  else console.log(`NOTE — default era is "${eraValue}"`);

  // Archetype shown.
  const fixed = await page.locator(".pzw-brief__fixed").innerText();
  if (fixed.includes("Retroverse Collectible Credential")) pass("Artifact archetype shown");
  else fail("Artifact archetype missing");

  // Toggles present and defaulted on.
  const tropes = await page.locator(".pzw-brief__toggle:has-text('Avoid Common Era Tropes') input").isChecked();
  const variation = await page.locator(".pzw-brief__toggle:has-text('Maximize Variation') input").isChecked();
  if (tropes && variation) pass("Anti-cliché toggles present and defaulted on");
  else fail(`Toggles wrong: tropes=${tropes} variation=${variation}`);

  // Per-card creative controls.
  const dirSelects = await page.locator(".pzw-card-creative__field:has(> span:text-is('Creative Direction')) select").count();
  const typeSelects = await page.locator(".pzw-card-creative__field:has(> span:text-is('Pass Type')) select").count();
  if (dirSelects === 3 && typeSelects === 3) pass("All 3 pass cards have Creative Direction + Pass Type selectors");
  else fail(`Card selectors: direction=${dirSelects} passType=${typeSelects}`);

  const generalDir = await page.locator(".pzw-card-creative__field:has(> span:text-is('Creative Direction')) select").first().inputValue();
  if (generalDir === "festival-pass") pass("General card defaults to Festival Pass direction");
  else fail(`General direction default is "${generalDir}"`);

  // 4. Edit fields and verify the brief persists.
  await page.locator(".pzw-brief__field:has(> span:text-is('Series')) input").fill("Retro Sundays");
  await page.locator(".pzw-brief__field:has(> span:text-is('Creative Notes')) textarea").fill("Lean into neon-free 80s print shop textures.");
  await page.locator(".pzw-brief__field:has(> span:text-is('RVBR Style')) select").selectOption({ index: 1 });
  await page.waitForTimeout(3000); // debounce + server action round-trip

  const briefPath = join(DATA_ROOT, "ops", "bobos", "project-zero", "pass-workspace", `${projectId}.json`);
  let saved = null;
  try {
    saved = JSON.parse(await readFile(briefPath, "utf8"));
  } catch (e) {
    fail(`Could not read persisted workspace file at ${briefPath}: ${e.message}`);
  }
  if (saved?.creative) {
    if (saved.creative.series === "Retro Sundays") pass("Edited Series persisted to creative brief");
    else fail(`Persisted series: "${saved.creative.series}"`);
    if (saved.creative.notes.includes("print shop")) pass("Creative Notes persisted");
    else fail(`Persisted notes: "${saved.creative.notes}"`);
    console.log(`INFO — persisted eraSlug: ${saved.creative.eraSlug}`);
  } else if (saved) {
    fail("Workspace file has no creative brief section");
  }

  // 5. Reload — brief should show the saved edits, not the seed.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pzw-brief", { timeout: 15000 });
  const seriesAfter = await page.locator(".pzw-brief__field:has(> span:text-is('Series')) input").inputValue();
  if (seriesAfter === "Retro Sundays") pass("Reopened workspace restores saved brief");
  else fail(`Reload lost the brief (series="${seriesAfter}")`);

  // 6. Production pipeline surfaces untouched.
  const generateBatch = await page.locator("button:has-text('Generate Batch')").count();
  const printSheets = await page.locator("text=Print Sheets").count();
  if (generateBatch >= 1) pass("Generate Batch button intact");
  else fail("Generate Batch missing");
  if (printSheets >= 1) pass("Print Sheets section intact");
  else fail("Print Sheets section missing");

  if (errors.length) fail(`Page errors: ${errors.join(" | ")}`);
  else pass("No page errors");
} catch (e) {
  fail(`Script error: ${e.message}`);
} finally {
  await browser.close();
}
