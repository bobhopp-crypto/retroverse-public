/**
 * Capture home search Spotlight overlay screenshots.
 * Run: npx tsx tools/capture-search-spotlight.ts
 *
 * Requires dev server: npm run dev
 */
import { mkdir } from "fs/promises";
import { join } from "path";

import { chromium } from "playwright";

const OUT = join(process.cwd(), "reports/search-spotlight-phase");
const BASE = process.env.SEARCH_CAPTURE_URL ?? "http://localhost:3000";

async function openOverlay(page: import("playwright").Page) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60_000 });
  await page.click(".home-search-trigger", { timeout: 30_000 });
  await page.waitForSelector(".home-search-overlay__input", { timeout: 15_000 });
}

async function captureSuggestions(
  page: import("playwright").Page,
  query: string,
  outFile: string,
) {
  await openOverlay(page);
  const input = page.locator(".home-search-overlay__input");
  await input.fill(query);
  await page.waitForSelector(".home-search-overlay-results .home-search-suggestions__item", {
    timeout: 20_000,
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: outFile, fullPage: false });
}

async function captureArtistNavigation(
  page: import("playwright").Page,
  outFile: string,
) {
  await openOverlay(page);
  const input = page.locator(".home-search-overlay__input");
  await input.fill("Joe Cocker");
  await page.waitForSelector('a.home-search-suggestions__item:has-text("Joe Cocker")', {
    timeout: 20_000,
  });
  await page.locator('a.home-search-suggestions__item:has-text("Joe Cocker")').first().click();
  await page.waitForURL("**/artist/joe-cocker", { timeout: 20_000 });
  await page.screenshot({ path: outFile, fullPage: true });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await captureSuggestions(
      page,
      "Joe Cocker",
      join(OUT, "mobile-joe-cocker-suggestions.png"),
    );
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await captureSuggestions(
      page,
      "Joe Cocker",
      join(OUT, "desktop-joe-cocker-suggestions.png"),
    );
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await captureArtistNavigation(page, join(OUT, "mobile-joe-cocker-artist-page.png"));
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await openOverlay(page);
    await page.locator(".home-search-overlay__input").fill("thriller");
    await page.waitForSelector(".home-search-suggestions__view-all", { timeout: 20_000 });
    await page.locator(".home-search-suggestions__view-all").click();
    await page.waitForURL("**/search?q=thriller", { timeout: 20_000 });
    await page.screenshot({ path: join(OUT, "mobile-discovery-search-page.png"), fullPage: true });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify({ outDir: OUT, base: BASE }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
