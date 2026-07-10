import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "https://retroverse.live";
const RICH_SLUG = process.env.VERIFY_ARTIST ?? "fleetwood-mac";
const SPARSE_SLUG = "elton-john";

const failures = [];

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`✗ ${msg}`);
}

async function verifyArtistPage(page, slug, label) {
  const url = `${BASE}/artist/${slug}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".artist-v1__name", { timeout: 60000 });

  const name = (await page.locator(".artist-v1__name").first().textContent())?.trim();
  if (!name) fail(`${label}: missing artist name`);
  else pass(`${label}: hero renders (${name})`);

  const searchPanel = page.locator(".rv2-live__search-panel");
  if (await searchPanel.isVisible()) fail(`${label}: search panel should be hidden`);
  else pass(`${label}: search panel hidden`);

  const legacyInfo = await page.locator(".explorer-btn--info").count();
  if (legacyInfo > 0) fail(`${label}: Info button still present`);
  else pass(`${label}: no Info button`);

  const rows = page.locator(".artist-v1 .explorer-row");
  const rowCount = await rows.count();
  if (rowCount === 0) {
    pass(`${label}: no song rows (sparse artist)`);
  } else {
    pass(`${label}: ${rowCount} song rows`);
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const actionCount = await row.locator(".explorer-row__actions .explorer-btn").count();
      if (actionCount !== 2) fail(`${label}: row ${i + 1} has ${actionCount} buttons`);
    }
    if (failures.filter((f) => f.startsWith(`${label}: row`)).length === 0) {
      pass(`${label}: every row has exactly 2 buttons`);
    }

    const playCount = await page.locator(".artist-v1 .explorer-btn--play").count();
    if (playCount !== rowCount) fail(`${label}: play count ${playCount} !== rows ${rowCount}`);
    else pass(`${label}: play on every row`);

    const hitHref = await rows.first().locator(".explorer-row__hit").getAttribute("href");
    if (!hitHref?.includes("/song/") && !hitHref?.includes("/retroverse-2/song/")) {
      fail(`${label}: row body href invalid: ${hitHref}`);
    } else pass(`${label}: row body links to song (${hitHref})`);
  }

  const albumLinks = page.locator(".artist-v1__album-card");
  const albumCount = await albumLinks.count();
  if (albumCount > 0) {
    const albumHref = await albumLinks.first().getAttribute("href");
    if (!albumHref?.includes("/album/")) fail(`${label}: album href invalid: ${albumHref}`);
    else pass(`${label}: ${albumCount} albums, first → ${albumHref}`);
  }

  const yearLinks = page.locator(".artist-v1__year-pill");
  const yearCount = await yearLinks.count();
  if (yearCount > 0) {
    const yearHref = await yearLinks.first().getAttribute("href");
    if (!yearHref?.includes("/rv/")) fail(`${label}: year href invalid: ${yearHref}`);
    else pass(`${label}: ${yearCount} years, first → ${yearHref}`);
  }

  const relatedLinks = page.locator(".artist-v1__related-card");
  const relatedCount = await relatedLinks.count();
  if (relatedCount > 0) {
    const relatedHref = await relatedLinks.first().getAttribute("href");
    if (!relatedHref?.includes("/artist/")) fail(`${label}: related href invalid: ${relatedHref}`);
    else pass(`${label}: ${relatedCount} related artists`);
  }

  const liveLink = page.locator(".artist-v1__footer-link--live").first();
  const liveHref = await liveLink.getAttribute("href");
  if (liveHref !== "/") fail(`${label}: Return to Live href is ${liveHref}`);
  else pass(`${label}: Return to Live link works`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });

try {
  await verifyArtistPage(page, RICH_SLUG, "Rich artist");
  await verifyArtistPage(page, SPARSE_SLUG, "Sparse artist");
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nAll artist page v1 checks passed.");
