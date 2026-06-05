import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1728, height: 900 } });

for (const [file, out] of [
  ["before-stacked-mockup.html", "before-stacked-layout.png"],
  ["after-deck-mockup.html", "after-deck-layout.png"],
]) {
  await page.goto(`file://${join(dir, file)}`, { waitUntil: "load" });
  await page.screenshot({ path: join(dir, out) });
  console.log(`Saved ${out}`);
}

await browser.close();
