import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const outDir = new URL(".", import.meta.url).pathname;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1728, height: 1117 } });
await page.goto("http://localhost:3000/ops/media-lab", { waitUntil: "networkidle" });

const yearSelect = page.locator('select').first();
if (await yearSelect.count()) {
  await yearSelect.selectOption("1967");
  await page.waitForTimeout(800);
}

const jobSelect = page.locator('select').nth(1);
if (await jobSelect.count()) {
  const options = await jobSelect.locator("option").allTextContents();
  const billboard = options.find((o) => /billboard/i.test(o));
  if (billboard) {
    await jobSelect.selectOption({ label: billboard });
  }
}

const loadBtn = page.getByRole("button", { name: /load saved job/i });
if (await loadBtn.count()) {
  await loadBtn.click();
  await page.waitForTimeout(4000);
}

await page.screenshot({
  path: `${outDir}/after-deck-layout.png`,
  fullPage: false,
});

await browser.close();
console.log(`Saved ${outDir}/after-deck-layout.png`);
