import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.ATLAS_SCREENSHOT_BASE ?? "http://localhost:3000";
const outDir = join(process.cwd(), "reports/atlas-phase-d");

await mkdir(outDir, { recursive: true });

const pages = [
  { path: "/ops/atlas/mission/RVTR097615", file: "mission-rhiannon-d2.png" },
  { path: "/ops/atlas/mission/RVTR097615", file: "mission-rhiannon-d2-full.png", fullPage: true },
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
await context.addCookies([
  {
    name: "retroverse_ops_gate",
    value: "ok",
    domain: "localhost",
    path: "/",
  },
]);

for (const { path, file, fullPage } of pages) {
  const page = await context.newPage();
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(outDir, file),
    fullPage: Boolean(fullPage),
  });
  await page.close();
  console.log(`Wrote ${file}`);
}

await browser.close();
