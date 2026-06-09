/**
 * Verify Media Lab trim preview + audio skimming polish.
 * Usage: npx tsx tools/media-collections/ms-trim-preview-capture.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.MS_CAPTURE_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/media-lab");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];
  const reactWarnings: string[] = [];

  const browser = await chromium.launch({
    channel: process.env.PW_CHROME_CHANNEL ?? "chrome",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => {
    const text = msg.text();
    if (/duplicate key|same key/i.test(text)) reactWarnings.push(text);
  });

  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);
  findings.push(`ops_duplicate_key: ${reactWarnings.length ? "FAIL" : "PASS"}`);
  await page.screenshot({ path: join(OUT, "trim-preview-ops.png"), fullPage: false });

  await page.goto(`${BASE}/ops/media-lab?library=performances&q=Smokey`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForSelector(".ml-workspace__list-item", { timeout: 60000 });
  await page.locator(".ml-workspace__list-item").first().click();
  await page.waitForSelector(".ops-ml-review__video", { timeout: 120000 });
  await page.waitForTimeout(2000);

  findings.push(`media_lab_duplicate_key: ${reactWarnings.length ? "FAIL" : "PASS"}`);

  const skimVisible = await page.locator('label.ml-perf-editor__skim:has-text("Audio Skimming")').isVisible();
  const skimDefaultOff = !(await page.locator(".ml-perf-editor__skim input").isChecked());
  findings.push(`audio_skim_checkbox: ${skimVisible ? "PASS" : "FAIL"}`);
  findings.push(`audio_skim_default_off: ${skimDefaultOff ? "PASS" : "FAIL"}`);

  const inHandle = page.locator(".ops-ml-selection__handle--in");
  const box = await inHandle.boundingBox();
  if (!box) throw new Error("in_handle_missing");

  const startIn = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return v?.currentTime ?? -1;
  });

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 50, y, { steps: 6 });
  await page.waitForTimeout(200);

  const midInDrag = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return {
      currentTime: v?.currentTime ?? -1,
      paused: v?.paused ?? true,
    };
  });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const afterInDrag = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    const playhead = document.querySelectorAll(".ops-ml-selection__readout-value")[1]?.textContent?.trim();
    return {
      currentTime: v?.currentTime ?? -1,
      paused: v?.paused ?? true,
      playhead,
    };
  });

  findings.push(
    `in_drag_live_preview: ${
      midInDrag.currentTime > startIn + 0.5 && midInDrag.paused ? "PASS" : "FAIL"
    } (${startIn.toFixed(1)}→${midInDrag.currentTime.toFixed(1)})`,
  );
  findings.push(
    `in_drag_release_playhead: ${afterInDrag.paused && afterInDrag.currentTime > startIn ? "PASS" : "FAIL"}`,
  );

  await page.screenshot({ path: join(OUT, "trim-preview-in-drag.png"), fullPage: false });

  const outHandle = page.locator(".ops-ml-selection__handle--out");
  const outBox = await outHandle.boundingBox();
  if (!outBox) throw new Error("out_handle_missing");
  const ox = outBox.x + outBox.width / 2;
  const oy = outBox.y + outBox.height / 2;
  await page.mouse.move(ox, oy);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const atOutStart = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return v?.currentTime ?? -1;
  });
  await page.mouse.move(ox - 50, oy, { steps: 6 });
  await page.waitForTimeout(200);

  const midOutDrag = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return v?.currentTime ?? -1;
  });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const afterOutDrag = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return { currentTime: v?.currentTime ?? -1, paused: v?.paused ?? true };
  });

  findings.push(
    `out_drag_live_preview: ${
      midOutDrag < atOutStart - 0.5 && midOutDrag > atOutStart - 120 ? "PASS" : "FAIL"
    } (${atOutStart.toFixed(1)}→${midOutDrag.toFixed(1)})`,
  );
  findings.push(
    `out_drag_release_playhead: ${afterOutDrag.paused && afterOutDrag.currentTime < atOutStart ? "PASS" : "FAIL"}`,
  );

  await page.screenshot({ path: join(OUT, "trim-preview-out-drag.png"), fullPage: false });

  await page.locator(".ml-perf-editor__skim input").check();
  await page.waitForTimeout(200);
  const skimOn = await page.locator(".ml-perf-editor__skim input").isChecked();
  findings.push(`audio_skim_toggle_on: ${skimOn ? "PASS" : "FAIL"}`);

  let heardPlay = false;
  await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    if (v) v.currentTime = (v.currentTime || 0);
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y, { steps: 4 });
  await page.waitForTimeout(250);
  heardPlay = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return v ? !v.paused || v.currentTime > 0 : false;
  });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const pausedAfterSkim = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(".ops-ml-review__video");
    return v?.paused ?? true;
  });
  findings.push(`audio_skim_on_scrub: ${heardPlay ? "PASS" : "FAIL"}`);
  findings.push(`audio_skim_stops_after_scrub: ${pausedAfterSkim ? "PASS" : "FAIL"}`);

  await page.locator(".ml-perf-editor__skim input").uncheck();
  await page.screenshot({ path: join(OUT, "trim-preview-audio-skim.png"), fullPage: false });

  const saveBtn = page.locator('button:has-text("Save Boundaries")');
  await saveBtn.click({ force: true });
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".ops-ml-selection__readout", { timeout: 120000 });
  findings.push(`save_reload: PASS`);

  if (reactWarnings.length) {
    findings.push("warnings:");
    findings.push(...reactWarnings);
  }

  writeFileSync(join(OUT, "trim-preview-findings.txt"), findings.join("\n") + "\n");
  console.log(findings.join("\n"));

  await browser.close();
  if (findings.some((f) => f.includes(": FAIL"))) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
