import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "https://retroverse.live";
const WEEK_DATE = "1986-05-10";
const FOCUS_RVTR = "RVTR044043";
const FOCUS_RANK = 3;

const results = [];
const failures = [];

function pass(msg) {
  results.push(`PASS: ${msg}`);
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`✗ ${msg}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  const weekUrl = `${BASE}/week/${WEEK_DATE}?focus=${FOCUS_RVTR}&rank=${FOCUS_RANK}`;
  await page.goto(weekUrl, { waitUntil: "networkidle", timeout: 120000 });

  await page.waitForSelector(".explorer__header", { timeout: 30000 });
  await page.waitForSelector(".explorer-row", { timeout: 30000 });
  pass("Explorer layout renders");

  const infoCount = await page.locator(".explorer-btn--info").count();
  if (infoCount > 0) fail(`Info button still present (${infoCount})`);
  else pass("Info button removed");

  const indicatorCount = await page.locator(".explorer-ind").count();
  if (indicatorCount > 0) fail(`Legacy indicators still present (${indicatorCount})`);
  else pass("Legacy status indicators removed");

  const rowCount = await page.locator(".explorer-row").count();
  for (let i = 0; i < rowCount; i++) {
    const row = page.locator(".explorer-row").nth(i);
    const actionCount = await row.locator(".explorer-row__actions .explorer-btn").count();
    if (actionCount !== 2) {
      fail(`Row ${i + 1} has ${actionCount} action buttons (expected exactly 2)`);
    }
  }
  if (failures.length === 0) pass(`Every row has exactly 2 action buttons (${rowCount} rows)`);

  const playCount = await page.locator(".explorer-btn--play").count();
  if (playCount !== rowCount) fail(`Play button count ${playCount} !== row count ${rowCount}`);
  else pass("Play button present on every row");

  const libraryCount =
    (await page.locator(".explorer-btn--library-check").count()) +
    (await page.locator(".explorer-btn--library-acquire").count());
  if (libraryCount !== rowCount) fail(`Library button count ${libraryCount} !== row count ${rowCount}`);
  else pass("Library button (✓ or +) present on every row");

  const hitLink = page.locator(".explorer-row--current .explorer-row__hit").first();
  const hitHref = await hitLink.getAttribute("href");
  if (!hitHref?.includes("/retroverse-2/song/")) fail(`Row body does not link to song page: ${hitHref}`);
  else pass(`Row body links to song page (${hitHref})`);

  const current = page.locator(".explorer-row--current");
  if ((await current.count()) !== 1) fail("Expected exactly one highlighted current row");
  else pass("Current song row is highlighted");

  const currentRank = await current.locator(".explorer-row__rank").textContent();
  if (currentRank?.trim() !== String(FOCUS_RANK)) {
    fail(`Current row rank is ${currentRank}, expected ${FOCUS_RANK}`);
  } else pass(`Current row at chart position #${FOCUS_RANK}`);

  const playBtn = current.locator(".explorer-btn--play");
  if (await playBtn.isDisabled()) fail("Play button disabled on focus row");
  else pass("Play button enabled on focus row");

  const directPlay = await page.locator(".explorer-btn--play-direct").count();
  const searchPlay = await page.locator(".explorer-btn--play-search").count();
  pass(`Play variants: ${directPlay} direct, ${searchPlay} search`);

  const checkCount = await page.locator(".explorer-btn--library-check").count();
  const acquireCount = await page.locator(".explorer-btn--library-acquire").count();
  pass(`Library state: ${checkCount} ✓, ${acquireCount} +`);

  const titles = await page.locator(".explorer-row__title").allTextContents();
  if (titles.length < 3 || titles.some((t) => !t.trim())) fail("Chart list missing real titles");
  else pass(`${titles.length} rows with real song titles`);
} catch (err) {
  fail(`Unhandled: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await browser.close();
}

console.log("\n--- Summary ---");
for (const r of results) console.log(r);
if (failures.length) {
  console.error("\nFailures:");
  for (const f of failures) console.error(f);
  process.exit(1);
}
console.log("\nAll explorer v1 checks passed.");
