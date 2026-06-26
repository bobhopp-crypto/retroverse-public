/**
 * Start demo channel, audit routes, capture screenshot paths.
 * Usage: npx tsx tools/audit-live-channel-local.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

import { startLiveChannel } from "@/lib/live-control/engine";
import { loadPublicLiveEntrySnapshot } from "@/lib/live-control/public-entry";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3002";
const OUT = join(process.cwd(), "reports/live-channel-audit");

async function fetchHead(path: string) {
  const res = await fetch(`${BASE}${path}`, { method: "HEAD", redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const started = await startLiveChannel({
    mode: "demo",
    contentSource: "year",
    year: 1971,
    readyOnly: true,
    order: "random",
    durationSeconds: 60,
  });

  const snapshot = await loadPublicLiveEntrySnapshot();
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    channel: {
      running: started.running,
      queueSize: started.queueRvtrs.length,
      firstRvtr: started.queueRvtrs[0] ?? null,
    },
    snapshot,
    routes: {} as Record<string, { status: number; location: string | null }>,
  };

  for (const path of ["/", "/live", "/sunday-nights", "/retroverse-2/live"]) {
    report.routes[path] = await fetchHead(path);
  }

  await writeFile(join(OUT, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(OUT, "01-home-redirect-mobile.png"), fullPage: true });

  const rvtr = snapshot.rvtr;
  if (rvtr) {
    await page.goto(`${BASE}/retroverse-2/song/${rvtr}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "02-song-experience-mobile.png"), fullPage: true });
  }

  await browser.close();

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nScreenshots: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
