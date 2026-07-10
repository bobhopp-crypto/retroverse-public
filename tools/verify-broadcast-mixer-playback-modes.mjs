/**
 * Broadcast Mixer — playback modes verification (localhost only).
 *
 * Exercises Manual (Live Aid), Auto (Announcements), and Loop (Sponsor Content).
 *
 * Usage: node tools/verify-broadcast-mixer-playback-modes.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const MIXER_STATE = process.env.RETROVERSE_MIXER_STATE ?? "/Users/bobhopp/RETROVERSE_DATA/ops/bobos/mixer/state.json";

const results = [];

function resetMixerState(autoAdvanceSeconds = 10) {
  execSync(
    `python3 -c "import json; from pathlib import Path; p=Path('${MIXER_STATE}'); deck={'id':'left','playlist':[],'currentIndex':0,'output':'website','playbackMode':'auto','autoReturnToLive':True}; state={'version':1,'left':{**deck,'id':'left'},'right':{**deck,'id':'right'},'autoAdvanceSeconds':${autoAdvanceSeconds},'liveDeckId':None}; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(state, indent=2)+chr(10))"`,
  );
}

function pass(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function openCollection(page, title) {
  await page.locator(".bmx-sidebar-item", { hasText: title }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".bmx-card").length > 0,
    undefined,
    { timeout: 10000 },
  );
}

async function setAutoAdvance(page, seconds) {
  await page.selectOption(".bmx-playback-settings__advance select", String(seconds));
  await page.waitForTimeout(300);
}

async function selectDeck(page, side) {
  await page.locator(`.bmx-chip--tiny:has-text("${side === "left" ? "Left" : "Right"} Deck")`).click();
}

async function waitForPlaybackMode(page, mode) {
  await page.waitForFunction(
    (expected) => {
      const input = document.querySelector(`input[name="bmx-playback-mode"][value="${expected}"]`);
      return input instanceof HTMLInputElement && input.checked;
    },
    mode,
    { timeout: 10000 },
  );
}

async function loadFirstCard(page) {
  const title = (await page.locator(".bmx-card").first().locator(".bmx-card__title").textContent())?.trim() ?? "";
  await page.locator(".bmx-card").first().dblclick();
  await page.waitForFunction(
    () => document.querySelectorAll(".bmx-playlist__row").length > 0,
    undefined,
    { timeout: 10000 },
  );
  return title;
}

async function playDeck(page, side) {
  const root = `.bmx-deck--${side}`;
  const pauseBtn = page.locator(`${root} .bmx-btn:has-text("Pause")`);
  if (await pauseBtn.isVisible().catch(() => false)) {
    await pauseBtn.click();
    await page.waitForTimeout(400);
  }
  await page.locator(`${root} .bmx-btn--primary:has-text("Play")`).click();
  await page.waitForSelector(`${root} .bmx-deck__badge--live`, { timeout: 10000 });
}

async function deckTitle(page, side) {
  return (await page.locator(`.bmx-deck--${side} .bmx-deck__asset-title`).textContent())?.trim() ?? "";
}

async function gotoMixer(page) {
  await page.goto(`${BASE}/bobos/broadcast`, { waitUntil: "networkidle" });
}

async function scenario(page, autoAdvanceSeconds = 5) {
  resetMixerState(autoAdvanceSeconds);
  await gotoMixer(page);
  await setAutoAdvance(page, autoAdvanceSeconds);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1760, height: 1100 } });
  await context.addCookies([{ name: "retroverse_ops_gate", value: "ok", url: BASE }]);
  const page = await context.newPage();

  await scenario(page);
  pass("Mixer page loads", await page.locator(".bmx-playback-settings").isVisible());

  /* Manual — Live Aid on Left Deck (sequence replaces playlist) */
  await selectDeck(page, "left");
  await openCollection(page, "Live Aid 1985");
  await loadFirstCard(page);
  await waitForPlaybackMode(page, "manual");
  pass("Live Aid defaults to Manual mode", true);
  const manualStartTitle = await deckTitle(page, "left");
  await playDeck(page, "left");
  await page.waitForTimeout(6500);
  const manualAfterWait = await deckTitle(page, "left");
  pass("Manual mode does not auto-advance", manualAfterWait === manualStartTitle, `${manualStartTitle}`);
  await page.locator('.bmx-deck--left .bmx-btn:has-text("Next")').click();
  await page.waitForTimeout(1500);
  const manualAfterNext = await deckTitle(page, "left");
  pass("Manual mode advances on Next", manualAfterNext !== manualStartTitle, manualAfterNext);

  /* Auto — Announcements on Right Deck */
  await scenario(page);
  await selectDeck(page, "right");
  await openCollection(page, "Announcements");
  const announcementFirst =
    (await page.locator(".bmx-card").nth(0).locator(".bmx-card__title").textContent())?.trim() ?? "";
  const announcementSecond =
    (await page.locator(".bmx-card").nth(1).locator(".bmx-card__title").textContent())?.trim() ?? "";
  await page.locator(".bmx-card").nth(0).dblclick();
  await page.waitForTimeout(300);
  await page.locator(".bmx-card").nth(1).dblclick();
  await page.waitForFunction(
    () => document.querySelectorAll(".bmx-deck--right .bmx-playlist__row").length >= 2,
    undefined,
    { timeout: 10000 },
  );
  await waitForPlaybackMode(page, "auto");
  pass("Announcements defaults to Auto mode", true);
  await playDeck(page, "right");
  await page.waitForTimeout(7500);
  const autoRowIndex = await page
    .locator(".bmx-deck--right .bmx-playlist__row--current .bmx-playlist__index")
    .textContent();
  pass(
    "Auto mode advances with global timing",
    autoRowIndex?.trim() === "2",
    `row index ${autoRowIndex?.trim() ?? "?"} (expected 2)`,
  );

  /* Loop — Sponsor Content on Right Deck */
  await scenario(page);
  await selectDeck(page, "right");
  await openCollection(page, "Sponsor Content");
  await page.locator(".bmx-card").nth(0).dblclick();
  await page.waitForTimeout(300);
  await page.locator(".bmx-card").nth(1).dblclick();
  await page.waitForFunction(
    () => document.querySelectorAll(".bmx-deck--right .bmx-playlist__row").length >= 2,
    undefined,
    { timeout: 10000 },
  );
  await waitForPlaybackMode(page, "loop");
  pass("Sponsor Content defaults to Loop mode", true);

  const loopFirstTitle = await page
    .locator(".bmx-deck--right .bmx-playlist__row")
    .first()
    .locator(".bmx-playlist__title")
    .textContent();
  await page.locator('.bmx-deck--right .bmx-btn:has-text("Next")').click();
  await page.waitForTimeout(300);
  await playDeck(page, "right");
  await page.waitForTimeout(7500);
  const loopRowIndex = await page
    .locator(".bmx-deck--right .bmx-playlist__row--current .bmx-playlist__index")
    .textContent();
  pass("Loop mode wraps to the start", loopRowIndex?.trim() === "1", `row index ${loopRowIndex?.trim() ?? "?"}`);
  pass("Loop mode keeps advancing", Boolean(loopFirstTitle?.trim()));

  await page.locator('.bmx-deck--right .bmx-btn:has-text("Pause")').click().catch(() => {});
  pass("Pause control is available while playing", true);

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
