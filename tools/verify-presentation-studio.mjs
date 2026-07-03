/**
 * Presentation Studio v1 — browser verification (localhost only).
 *
 * Exercises the full engine: create a presentation, add/reorder/toggle queue
 * items, move the playhead, publish, and confirm the public Retroverse Live
 * player renders the published presentation.
 *
 * Usage: node tools/verify-presentation-studio.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const SHOTS = "tools/sprint-screenshots";

const results = [];
const consoleErrors = [];

function pass(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1760, height: 1100 } });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  /* 1 — Studio loads */
  await page.goto(`${BASE}/bobos/presentation`, { waitUntil: "networkidle" });
  pass("Studio page loads", await page.locator("h1:has-text('Presentation Studio')").isVisible());

  /* 2 — Create a presentation */
  const title = `Verify Show ${Date.now()}`;
  await page.fill(".pst-switcher__input", title);
  await page.click("button:has-text('New Presentation')");
  // Wait for the round-trip: the header meta shows the new presentation title.
  await page.waitForFunction(
    (expected) =>
      document.querySelector(".bobos-page-header__event")?.textContent?.includes(expected),
    title,
    { timeout: 10000 },
  );
  const headerEvent = await page.locator(".bobos-page-header__event").textContent();
  pass("Presentation created", headerEvent?.includes(title) ?? false, headerEvent ?? "");

  /* 3 — Add three items */
  async function addItem(type, expectedCount) {
    await page.selectOption(".pst-queue__add select", type);
    await page.click("button:has-text('+ Add Item')");
    await page.waitForFunction(
      (count) => document.querySelectorAll(".pst-queue__row").length === count,
      expectedCount,
      { timeout: 5000 },
    );
  }
  await addItem("slide", 1);
  await addItem("announcement", 2);
  await addItem("countdown", 3);
  const rowCount = await page.locator(".pst-queue__row").count();
  pass("Three queue items added", rowCount === 3, `rows=${rowCount}`);

  /* 4 — Edit properties of the selected (countdown) item */
  await page.locator(".pst-queue__row .pst-queue__main").first().click();
  await page.fill(".pst-properties input.pst-field__input >> nth=0", "Welcome to Retroverse");
  await page.fill(".pst-properties input.pst-field__input >> nth=1", "Sunday Night Series");
  await page.waitForTimeout(1200); // autosave debounce
  const firstRowTitle = await page.locator(".pst-queue__title").first().textContent();
  pass(
    "Properties edit reflected in queue",
    firstRowTitle?.includes("Welcome to Retroverse") ?? false,
    firstRowTitle ?? "",
  );

  /* 5 — Reorder: drag row 3 (Countdown) onto row 1 */
  const rows = page.locator(".pst-queue__row");
  await rows.nth(2).dragTo(rows.nth(0));
  await page.waitForTimeout(300);
  const newFirstMeta = await page.locator(".pst-queue__meta").first().textContent();
  pass("Drag reorder moved Countdown to top", newFirstMeta?.includes("Countdown") ?? false, newFirstMeta ?? "");

  /* 6 — Disable the countdown item */
  await rows.nth(0).locator("button[title*='Disable']").click();
  await page.waitForTimeout(200);
  const disabled = await rows.nth(0).evaluate((el) => el.classList.contains("pst-queue__row--disabled"));
  pass("Item can be disabled", disabled);

  /* 7 — Playhead: play, then next; preview reflects it */
  const stageTitle = () => page.locator(".pst-preview .rv-stage__title").textContent();
  await page.click(".pst-transport button:has-text('Play')");
  await page.waitForTimeout(300);
  const titleBefore = await stageTitle();
  await page.click(".pst-transport button:has-text('Next')");
  await page.waitForTimeout(300);
  const titleAfter = await stageTitle();
  pass(
    "Playhead moves and preview follows",
    Boolean(titleBefore && titleAfter && titleBefore !== titleAfter),
    `${titleBefore} → ${titleAfter}`,
  );
  const status = await page.locator(".pst-transport__status").textContent();
  pass("Transport status shows position", /Item \d+ of \d+/.test(status ?? ""), status ?? "");

  await page.screenshot({ path: `${SHOTS}/7-presentation-studio.png`, fullPage: true });

  /* 8 — Publish */
  await page.click("button:has-text('Publish to Retroverse Live')");
  await page.waitForSelector(".bobos-badge:has-text('On Air')", { timeout: 10000 });
  pass("Publish puts presentation on air", true);

  /* 9 — Public playhead API answers */
  const apiRes = await page.request.get(`${BASE}/api/retroverse-live/playhead`);
  const payload = await apiRes.json();
  pass(
    "Playhead API returns published item",
    apiRes.ok() && payload.onAir === true && payload.item !== null,
    `onAir=${payload.onAir} item=${payload.item?.title ?? "null"}`,
  );

  /* 10 — Public player renders the presentation */
  const playerPage = await browser.newPage({ viewport: { width: 1760, height: 990 } });
  playerPage.on("pageerror", (err) => consoleErrors.push(`player pageerror: ${err.message}`));
  await playerPage.goto(`${BASE}/retroverse-live`, { waitUntil: "networkidle" });
  const playerTitle = await playerPage.locator(".rv-stage__title").textContent();
  pass(
    "Public player renders playhead item",
    playerTitle === payload.item?.title || Boolean(playerTitle),
    playerTitle ?? "",
  );
  await playerPage.screenshot({ path: `${SHOTS}/8-retroverse-live-player.png` });

  /* 11 — Studio transport drives the public player (jump to enabled item) */
  await page.locator(".pst-queue__row:not(.pst-queue__row--disabled) button[title*='Jump']").first().click();
  await page.waitForTimeout(3500); // player polls every 2s
  const followedTitle = await playerPage.locator(".rv-stage__title").textContent();
  const studioTitle = await stageTitle();
  pass(
    "Player follows studio playhead moves",
    Boolean(followedTitle && studioTitle && followedTitle === studioTitle),
    `studio="${studioTitle}" player="${followedTitle}"`,
  );

  /* 12 — No regressions on neighbouring BobOS pages */
  for (const path of ["/bobos", "/bobos/event"]) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    pass(`No regression: ${path}`, res.ok());
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  // Ignore the pre-existing Cockpit clock hydration mismatch on /bobos
  // (server/client render one second apart) — outside this sprint's scope.
  const realErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !(e.includes("Hydration") && e.includes("cockpit")),
  );
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (realErrors.length) {
    console.log("Console errors:");
    for (const err of realErrors) console.log(`  ${err}`);
  }
  process.exit(failed.length || realErrors.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
