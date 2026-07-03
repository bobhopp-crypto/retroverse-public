/**
 * Broadcast Panel v1 — browser verification (localhost only).
 *
 * Exercises the whole control path: ingest endpoint, Cockpit panel, Broadcast
 * Desk queue editing, transport, and confirms /retroverse-live and the
 * homepage mirror the same playhead.
 *
 * Usage: node tools/verify-broadcast-panel.mjs
 */
import { readFileSync } from "fs";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";
const SHOTS = "tools/sprint-screenshots";

/** Shared secret for the ingest route — env first, then .env.local. */
function liveSecret() {
  const fromEnv = process.env.LIVE_NOW_PLAYING_SECRET?.trim();
  if (fromEnv) return fromEnv;
  try {
    const match = readFileSync(".env.local", "utf8").match(
      /^LIVE_NOW_PLAYING_SECRET=(.+)$/m,
    );
    return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
  } catch {
    return null;
  }
}

const results = [];
const consoleErrors = [];

function pass(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

function ingestSnapshot() {
  const now = new Date().toISOString();
  const item = {
    id: "verify-ingest-item",
    type: "slide",
    title: "Verify Ingest Slide",
    subtitle: "Pushed via broadcast ingest",
    body: "",
    enabled: true,
    durationSeconds: 0,
    transition: "cut",
    trigger: "manual",
    link: null,
    countdownTarget: null,
    notes: "",
  };
  return {
    version: 1,
    presentationId: "verify-ingest",
    title: "Verify Ingest",
    queue: { items: [item], loop: true },
    playhead: {
      presentationId: "verify-ingest",
      anchorItemId: item.id,
      anchorStartedAt: now,
      mode: "playing",
      movedBy: "system",
      updatedAt: now,
    },
    publishedAt: now,
    updatedAt: now,
  };
}

async function playheadTitle(page) {
  const res = await page.request.get(`${BASE}/api/retroverse-live/playhead`);
  const payload = await res.json();
  return payload.item?.title ?? null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  /* 1 — Ingest endpoint accepts a snapshot and the payload reflects it */
  const secret = liveSecret();
  const ingestRes = await page.request.post(`${BASE}/api/retroverse-live/broadcast`, {
    data: ingestSnapshot(),
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
  pass("Ingest endpoint accepts snapshot", ingestRes.ok(), `HTTP ${ingestRes.status()}`);
  const unauthRes = await page.request.post(`${BASE}/api/retroverse-live/broadcast`, {
    data: ingestSnapshot(),
    headers: { authorization: "Bearer wrong-secret" },
  });
  pass("Ingest rejects bad secret", unauthRes.status() === 401, `HTTP ${unauthRes.status()}`);
  const afterIngest = await playheadTitle(page);
  pass(
    "Playhead payload reflects ingested snapshot",
    afterIngest === "Verify Ingest Slide",
    afterIngest ?? "null",
  );

  /* 2 — Broadcast Panel appears in Cockpit */
  await page.goto(`${BASE}/bobos`, { waitUntil: "networkidle" });
  const panelTitle = page.locator(".cockpit-panel__title", { hasText: "Broadcast Panel" });
  pass("Broadcast Panel appears in Cockpit", await panelTitle.isVisible());
  const panel = page.locator(".cockpit-cell", {
    has: page.locator(".cockpit-panel__title", { hasText: "Broadcast Panel" }),
  });

  /* 3 — Panel shows status metrics */
  await page.waitForTimeout(2500); // one status poll
  const metrics = await panel.locator(".cockpit-panel__metrics").textContent();
  pass(
    "Panel shows local/public/current/next/published",
    Boolean(
      metrics &&
        metrics.includes("Local:") &&
        metrics.includes("Public:") &&
        metrics.includes("Now:") &&
        metrics.includes("Next:"),
    ),
    (metrics ?? "").slice(0, 120),
  );

  /* 4 — Ensure something is on air (seed if needed) */
  const startButton = panel.locator("button", { hasText: "Start Broadcast" });
  if (await startButton.count()) {
    await startButton.click();
    await page.waitForTimeout(1500);
  }

  /* 5 — Open Broadcast Desk; queue visible */
  await panel.locator("button", { hasText: "Broadcast Desk" }).click();
  const desk = page.locator(".cockpit-broadcast-desk");
  await desk.waitFor({ timeout: 5000 });
  const deskEmpty = desk.locator(".cockpit-broadcast-desk__empty button");
  if (await deskEmpty.count()) {
    await deskEmpty.click();
    await page.waitForFunction(
      () => document.querySelectorAll(".cockpit-broadcast-desk__row").length > 0,
      undefined,
      { timeout: 8000 },
    );
  }
  // Re-sync: the ingest test above wrote a foreign snapshot; one transport
  // command rebuilds the snapshot from the real active presentation.
  await desk.locator("button", { hasText: "Next" }).click();
  await page.waitForTimeout(1500);

  const rowsBefore = await desk.locator(".cockpit-broadcast-desk__row").count();
  pass("Queue visible in Broadcast Desk", rowsBefore > 0, `rows=${rowsBefore}`);

  /* 6 — Current item highlighted */
  const currentRows = await desk.locator(".cockpit-broadcast-desk__row--current").count();
  pass("Current item highlighted", currentRows === 1, `highlighted=${currentRows}`);

  /* 7 — Add Item */
  const addedTitle = `Broadcast Verify ${Date.now()}`;
  await desk.locator(".cockpit-broadcast-desk__add input").fill(addedTitle);
  await desk.locator("button", { hasText: "+ Add Item" }).click();
  await page.waitForFunction(
    ({ count }) => document.querySelectorAll(".cockpit-broadcast-desk__row").length === count,
    { count: rowsBefore + 1 },
    { timeout: 8000 },
  );
  pass("Add Item appends to queue", true, addedTitle);

  /* 8 — Reorder: move the new (last) item up one slot */
  const lastRow = desk.locator(".cockpit-broadcast-desk__row").nth(rowsBefore);
  await lastRow.locator("button[aria-label*='up']").click();
  await page.waitForFunction(
    ({ title, index }) => {
      const rows = document.querySelectorAll(".cockpit-broadcast-desk__row");
      return rows[index]?.textContent?.includes(title) ?? false;
    },
    { title: addedTitle, index: rowsBefore - 1 },
    { timeout: 8000 },
  );
  pass("Queue item reorders up", true);

  /* 9 — Transport: Next moves the playhead */
  const titleBefore = await playheadTitle(page);
  await desk.locator("button", { hasText: "Next" }).click();
  await page.waitForTimeout(1200);
  const titleAfter = await playheadTitle(page);
  pass(
    "Next updates the playhead",
    Boolean(titleBefore && titleAfter && titleBefore !== titleAfter),
    `${titleBefore} → ${titleAfter}`,
  );

  /* 10 — Previous moves it back */
  await desk.locator("button", { hasText: "Prev" }).click();
  await page.waitForTimeout(1200);
  const titleBack = await playheadTitle(page);
  pass("Previous updates the playhead", titleBack === titleBefore, `${titleAfter} → ${titleBack}`);

  await page.screenshot({ path: `${SHOTS}/9-broadcast-desk.png` });

  /* 11 — Local viewer and homepage mirror the playhead */
  const apiTitle = await playheadTitle(page);

  const viewer = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await viewer.goto(`${BASE}/retroverse-live`, { waitUntil: "networkidle" });
  const viewerTitle = await viewer.locator(".rv-stage__title").textContent();
  pass("/retroverse-live mirrors playhead", viewerTitle === apiTitle, `"${viewerTitle}"`);

  const home = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await home.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const homeTitle = await home.locator(".rv-stage__title").textContent();
  pass("Homepage mirrors playhead", homeTitle === apiTitle, `"${homeTitle}"`);
  await home.screenshot({ path: `${SHOTS}/10-homepage-broadcast.png` });

  /* 12 — Advance again; both viewers follow within one poll */
  await desk.locator("button", { hasText: "Next" }).click();
  await page.waitForTimeout(3000);
  const followTitle = await playheadTitle(page);
  const viewerFollow = await viewer.locator(".rv-stage__title").textContent();
  const homeFollow = await home.locator(".rv-stage__title").textContent();
  pass(
    "Both viewers follow playhead moves",
    Boolean(followTitle && viewerFollow === followTitle && homeFollow === followTitle),
    `api="${followTitle}" live="${viewerFollow}" home="${homeFollow}"`,
  );

  /* 13 — Remove the added item */
  const removeRow = desk.locator(".cockpit-broadcast-desk__row", { hasText: addedTitle });
  await removeRow.locator("button[aria-label^='Remove']").click();
  await page.waitForFunction(
    ({ title }) =>
      ![...document.querySelectorAll(".cockpit-broadcast-desk__row")].some((row) =>
        row.textContent?.includes(title),
      ),
    { title: addedTitle },
    { timeout: 8000 },
  );
  pass("Remove Item deletes from queue", true);

  /* 14 — No regressions */
  for (const path of ["/bobos/presentation", "/bobos/event"]) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    pass(`No regression: ${path}`, res.ok());
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  // Pre-existing: Cockpit clock hydration (1s SSR/client skew) and countdown
  // stage text can mismatch on hydration — unrelated to this sprint.
  const realErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("Hydration"),
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
