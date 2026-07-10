/**
 * Broadcast Mixer — Live Aid 1985 end-to-end verification (localhost only).
 *
 * Confirms the imported "Live Aid 1985" collection shows up in the Asset
 * Browser sidebar, double-clicking a sequence loads it onto a deck, Play
 * starts the presentation engine, and the Audience Preview renders the
 * imported slide image.
 *
 * Usage: node tools/verify-broadcast-mixer-live-aid.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";

const results = [];
const consoleErrors = [];

function pass(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1760, height: 1100 } });
  await context.addCookies([
    { name: "retroverse_ops_gate", value: "ok", url: BASE },
  ]);
  const page = await context.newPage();
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE}/bobos/broadcast`, { waitUntil: "networkidle" });
  pass("Mixer page loads", await page.locator(".bmx-browser").isVisible());

  const liveAidItem = page.locator(".bmx-sidebar-item", { hasText: "Live Aid 1985" });
  pass("Live Aid 1985 appears in sidebar", await liveAidItem.isVisible());
  await liveAidItem.click();

  await page.waitForFunction(
    () => document.querySelectorAll(".bmx-card").length > 0,
    undefined,
    { timeout: 10000 },
  );
  const cardCount = await page.locator(".bmx-card").count();
  pass("Sequence cards render for Live Aid 1985", cardCount > 0, `${cardCount} cards`);

  await page.locator('.bmx-chip--tiny:has-text("Left Deck")').click();

  const firstCard = page.locator(".bmx-card").first();
  const firstCardTitle = (await firstCard.locator(".bmx-card__title").textContent())?.trim() ?? "";
  await firstCard.dblclick();

  await page.waitForFunction(
    () => (document.querySelector(".bmx-deck--left .bmx-playlist__row") ?? null) !== null,
    undefined,
    { timeout: 10000 },
  );
  const leftPlaylistRows = await page.locator(".bmx-deck--left .bmx-playlist__row").count();
  pass(
    "Double-click loads sequence into Left Deck playlist",
    leftPlaylistRows > 0,
    `${leftPlaylistRows} slides queued (${firstCardTitle})`,
  );

  const deckAssetTitle = await page.locator(".bmx-deck--left .bmx-deck__asset-title").textContent();
  pass("Left Deck preview shows a cued asset", Boolean(deckAssetTitle?.trim()), deckAssetTitle ?? "");

  await page.locator('.bmx-deck--left .bmx-btn--primary:has-text("Play")').click();

  await page.waitForFunction(
    () => document.querySelector(".bmx-deck--left .bmx-deck__badge--live") !== null,
    undefined,
    { timeout: 10000 },
  );
  pass("Left Deck goes LIVE after Play", await page.locator(".bmx-deck--left .bmx-deck__badge--live").isVisible());

  const enginePlayingBadge = page.locator(".bmx-deck--left .bmx-deck__badge--active");
  pass("Left Deck badge shows PLAYING", await enginePlayingBadge.isVisible());

  await page.waitForTimeout(3200);
  const progressFillWidth = await page
    .locator(".bmx-deck--left .bmx-deck__progress-fill")
    .evaluate((el) => el.style.width);
  pass("Progress bar advances", progressFillWidth !== "0%" && progressFillWidth !== "", progressFillWidth);

  const stageImg = page.locator(".bmx-audience .rv-stage__slide-img");
  await stageImg.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const stageImgSrc = await stageImg.getAttribute("src").catch(() => null);
  pass(
    "Audience Preview renders imported slide image",
    Boolean(stageImgSrc && stageImgSrc.includes("/api/retroverse-live/broadcast-media/")),
    stageImgSrc ?? "no image",
  );

  await page.locator('.bmx-deck--left .bmx-btn:has-text("⏸ Pause")').click().catch(() => {});

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (consoleErrors.length > 0) {
    console.log("\nConsole errors observed:");
    for (const err of consoleErrors) console.log(`  - ${err}`);
  }
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
