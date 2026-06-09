/**
 * Verify Media Lab editor restoration: play, trim, save.
 * Usage: npx tsx tools/media-collections/ms-editor-restoration-capture.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/media-lab");

type TrimProbe = {
  inText: string;
  outText: string;
  lengthText: string;
};

async function readTrim(page: import("playwright").Page): Promise<TrimProbe> {
  const labels = page.locator(".ops-ml-selection__readout");
  const inText = (await labels.nth(0).locator(".ops-ml-selection__readout-value").textContent()) ?? "";
  const outText = (await labels.nth(2).locator(".ops-ml-selection__readout-value").textContent()) ?? "";
  const lengthText = (await labels.nth(3).locator(".ops-ml-selection__readout-value").textContent()) ?? "";
  return { inText: inText.trim(), outText: outText.trim(), lengthText: lengthText.trim() };
}

async function dragHandle(
  page: import("playwright").Page,
  handle: "in" | "out",
  deltaX: number,
): Promise<void> {
  const sel = handle === "in" ? ".ops-ml-selection__handle--in" : ".ops-ml-selection__handle--out";
  const box = await page.locator(sel).boundingBox();
  if (!box) throw new Error(`handle_missing:${handle}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 8 });
  await page.mouse.up();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];
  const consoleErrors: string[] = [];

  const browser = await chromium.launch({
    channel: process.env.PW_CHROME_CHANNEL ?? "chrome",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/media-lab?library=performances&q=Smokey`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace__list-item", { timeout: 60000 });
  await page.locator(".ml-workspace__list-item").first().click();
  await page.waitForSelector(".ops-ml-review__video", { timeout: 120000 });
  await page.waitForTimeout(1500);

  // Play / pause
  const playBtn = page.locator('.ml-perf-editor__transport button:has-text("Play")');
  await playBtn.click({ force: true });
  await page.waitForTimeout(1200);
  const pausedAfterPlay = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return v?.paused ?? true;
  });
  findings.push(`play_starts: ${pausedAfterPlay ? "FAIL" : "PASS"}`);
  await page.screenshot({ path: join(OUT, "editor-restore-play.png"), fullPage: false });

  const pauseBtn = page.locator('.ml-perf-editor__transport button:has-text("Pause")');
  if (await pauseBtn.count()) {
    await pauseBtn.click({ force: true });
    await page.waitForTimeout(400);
  }
  const pausedAfterPause = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return v?.paused ?? true;
  });
  findings.push(`pause_works: ${pausedAfterPause ? "PASS" : "FAIL"}`);

  // Trim probes
  const before = await readTrim(page);
  await dragHandle(page, "in", 40);
  await page.waitForTimeout(300);
  const afterIn = await readTrim(page);
  findings.push(
    `in_drag_independent: ${
      afterIn.inText !== before.inText && afterIn.outText === before.outText ? "PASS" : "FAIL"
    } (${before.inText}→${afterIn.inText}, out ${before.outText}→${afterIn.outText})`,
  );

  await dragHandle(page, "out", -40);
  await page.waitForTimeout(300);
  const afterOut = await readTrim(page);
  findings.push(
    `out_drag_independent: ${
      afterOut.outText !== afterIn.outText && afterOut.inText === afterIn.inText ? "PASS" : "FAIL"
    } (in ${afterIn.inText}→${afterOut.inText}, out ${afterIn.outText}→${afterOut.outText})`,
  );

  await page.screenshot({ path: join(OUT, "editor-restore-trim.png"), fullPage: false });

  // Save boundaries
  const saveBtn = page.locator('button:has-text("Save Boundaries")');
  if (await saveBtn.count()) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(2000);
    const afterSave = await readTrim(page);
    findings.push(`save_reload_in: ${afterSave.inText}`);
    findings.push(`save_reload_out: ${afterSave.outText}`);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".ops-ml-selection__readout", { timeout: 120000 });
    await page.waitForTimeout(1500);
    const afterReload = await readTrim(page);
    const persistOk = afterReload.inText === afterSave.inText && afterReload.outText === afterSave.outText;
    findings.push(`boundaries_persist: ${persistOk ? "PASS" : "FAIL"}`);
    await page.screenshot({ path: join(OUT, "editor-restore-after-reload.png"), fullPage: false });
  } else {
    findings.push("save_bounds_button: MISSING");
  }

  const fsErrors = consoleErrors.filter((e) => /fs\/promises|Can't resolve 'fs/i.test(e));
  findings.push(`fs_promises_errors: ${fsErrors.length ? "FAIL" : "PASS"}`);

  writeFileSync(join(OUT, "editor-restore-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  await browser.close();

  const failed = findings.some((f) => f.includes(": FAIL"));
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
