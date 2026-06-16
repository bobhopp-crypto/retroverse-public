import { chromium } from "playwright";
import { join } from "node:path";

const base = "http://localhost:3000";
const outDir = join(process.cwd(), "reports/atlas-phase-a");

const pages = [
  { path: "/ops/atlas", file: "world-map.png" },
  { path: "/ops/atlas/1970s", file: "1970s-territory.png" },
  { path: "/ops/atlas/workshop", file: "workshop.png" },
  { path: "/ops/atlas/mission/RVTR097615", file: "mission-rhiannon.png" },
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

for (const { path, file } of pages) {
  const page = await context.newPage();
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, file), fullPage: false });
  await page.close();
  console.log(`Wrote ${file}`);
}

await browser.close();
