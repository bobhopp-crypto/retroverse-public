#!/usr/bin/env npx tsx
/**
 * Capture public song sheet screenshots.
 *
 * Usage:
 *   npx tsx tools/intelligence/capture-song-sheets.ts RVTR285085 ...
 *   npx tsx tools/intelligence/capture-song-sheets.ts --from-batch
 */
import { mkdir } from "fs/promises";
import { join } from "path";
import { chromium } from "playwright";

import { loadBatchStatus } from "../../lib/ops/intelligence/batch-status.ts";

const BASE = process.env.SONG_SHEET_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "reports", "intelligence", "song-sheet-screenshots");

async function capture(rvtrs: string[]) {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  for (const rvtr of rvtrs) {
    const url = `${BASE}/rvtr/${rvtr}/song-sheet`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.screenshot({ path: join(OUT_DIR, `${rvtr}-mobile.png`), fullPage: true });
    console.log(`  ✓ ${rvtr}`);
  }

  await browser.close();
}

async function main() {
  const argv = process.argv.slice(2);
  let rvtrs = argv.filter((a) => /^RVTR\d{6}$/i.test(a)).map((r) => r.toUpperCase());

  if (argv.includes("--from-batch")) {
    const batch = await loadBatchStatus();
    rvtrs = batch.jobs.filter((j) => j.status === "published").map((j) => j.rvtr).slice(0, 5);
  }

  if (rvtrs.length === 0) {
    rvtrs = ["RVTR285085"];
  }

  console.log(`Capturing ${rvtrs.length} song sheets from ${BASE}`);
  await capture(rvtrs);
  console.log(`\nScreenshots: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
