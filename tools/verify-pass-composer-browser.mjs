/**
 * BobOS Pass Composer 1.0 — browser verification (localhost only).
 * Usage: node tools/verify-pass-composer-browser.mjs [projectId]
 */
import { createHash } from "crypto";
import { execSync } from "child_process";
import { writeFile } from "fs/promises";
import { join } from "path";
import { chromium } from "playwright";
import sharp from "sharp";

const PROJECT_ID = process.argv[2] ?? "f244eb49-9c60-4159-b1cd-50e5c5af5e5f";
const BASE = process.env.PASS_VERIFY_BASE ?? "http://localhost:3000";
const URL = `${BASE}/bobos/project/${PROJECT_ID}/workspace/passes`;

const FINISHED_WIDTH = 987;
const FINISHED_HEIGHT = 1536;
const SERIAL_RESERVE = { left: 50, top: 1281, width: 887, height: 228 };

const results = [];
const consoleErrors = [];
const networkFailures = [];

function pass(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

function hashDataUrl(dataUrl) {
  return hashBuffer(Buffer.from(dataUrl?.split(",")[1] ?? "", "base64"));
}

async function waitForImageChange(locator, previousSrc, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const src = await locator.getAttribute("src");
    if (src && src !== previousSrc) return src;
    await new Promise((r) => setTimeout(r, 250));
  }
  return locator.getAttribute("src");
}

async function fetchBuffer(page, url) {
  const abs = url.startsWith("http") ? url : `${BASE}${url.split("?")[0]}`;
  const resp = await page.request.get(abs);
  if (!resp.ok()) throw new Error(`HTTP ${resp.status()} for ${abs}`);
  return Buffer.from(await resp.body());
}

async function decodeQrFromPng(png) {
  const { default: jsQR } = await import("jsqr");
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    pixels[i * 4] = data[i * info.channels];
    pixels[i * 4 + 1] = data[i * info.channels + 1];
    pixels[i * 4 + 2] = data[i * info.channels + 2];
    pixels[i * 4 + 3] = 255;
  }
  return jsQR(pixels, info.width, info.height)?.data ?? null;
}

async function serialZoneHasInk(png, reserve) {
  const region = await sharp(png).extract(reserve).greyscale().raw().toBuffer();
  let dark = 0;
  for (const v of region) if (v < 80) dark += 1;
  return dark / region.length;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("requestfailed", (req) => {
    networkFailures.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "failed"}`);
  });

  const resp = await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  pass("1. Open Pass Workspace", resp?.ok() ?? false, URL);
  await page.waitForSelector(".pzw-workspace", { timeout: 30000 });

  const composerBlocks = page.locator(".pzw-composer-preview");
  pass("2. Composer Preview on artwork cards", (await composerBlocks.count()) === 3, `count=${await composerBlocks.count()}`);

  for (let i = 0; i < 3; i++) {
    const img = composerBlocks.nth(i).locator(".pzw-composer-preview__image");
    await img.waitFor({ state: "visible", timeout: 90000 });
    const src = await img.getAttribute("src");
    pass(`2.${i + 1} Composer Preview image loaded`, src?.startsWith("data:image/png") ?? false, src?.slice(0, 40) ?? "");
  }

  const firstComposer = composerBlocks.first();
  const composerImg = firstComposer.locator(".pzw-composer-preview__image");
  const frontSrcBefore = await composerImg.getAttribute("src");
  await firstComposer.getByRole("button", { name: "Back", exact: true }).click();
  const backSrc = await waitForImageChange(composerImg, frontSrcBefore);
  pass(
    "3. Front/Back toggle changes preview",
    Boolean(backSrc && frontSrcBefore && backSrc !== frontSrcBefore),
    `front=${hashDataUrl(frontSrcBefore)} back=${hashDataUrl(backSrc)}`,
  );

  const firstCard = page.locator(".pzw-artwork-card").first();
  await firstCard.getByRole("button", { name: "Print Boost" }).click();
  await firstComposer.getByRole("button", { name: "Front", exact: true }).click();
  const frontBeforeBoost = await waitForImageChange(composerImg, backSrc);
  const printBoostCheckbox = firstCard.locator('.pzw-boost input[type="checkbox"]');
  await printBoostCheckbox.uncheck();
  const boostOffSrc = await waitForImageChange(composerImg, frontBeforeBoost);
  await printBoostCheckbox.check();
  const boostOnSrc = await waitForImageChange(composerImg, boostOffSrc);
  pass(
    "4. Print Boost updates Composer Preview",
    Boolean(boostOffSrc && boostOnSrc && boostOffSrc !== boostOnSrc),
    `off=${hashDataUrl(boostOffSrc)} on=${hashDataUrl(boostOnSrc)}`,
  );

  const cards = page.locator(".pzw-artwork-card");
  for (let i = 0; i < 3; i++) {
    await cards.nth(i).locator(".pzw-qty input").fill(i === 0 ? "1" : "0");
  }

  const generateBtn = page.getByRole("button", { name: "Generate Batch" });
  const batchPreviewImg = page.locator(".pzw-section.pzw-panel").filter({ hasText: "Preview" }).locator(".pzw-preview__image");
  const previewBefore = await batchPreviewImg.count() ? await batchPreviewImg.getAttribute("src") : null;

  await generateBtn.click();
  await page.getByRole("button", { name: "Generating…" }).waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await generateBtn.waitFor({ state: "visible", timeout: 180000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".pzw-section.pzw-panel .pzw-preview__image");
      return el?.getAttribute("src")?.includes("/api/bobos/pass-workspace/files/") ?? false;
    },
    { timeout: 180000 },
  );

  const batchFrontUrl = await batchPreviewImg.getAttribute("src");
  pass("5. Generate Batch completes", true, "composed preview visible");
  pass(
    "5. Batch front URL is composed render",
    batchFrontUrl?.includes("/api/bobos/pass-workspace/files/") ?? false,
    batchFrontUrl ?? "",
  );
  pass(
    "5. Batch preview updated after generate",
    !previewBefore || batchFrontUrl !== previewBefore,
    previewBefore ? "URL changed" : "first batch",
  );

  const batchFrontBuf = batchFrontUrl ? await fetchBuffer(page, batchFrontUrl) : Buffer.alloc(0);
  const batchMeta = batchFrontBuf.length ? await sharp(batchFrontBuf).metadata() : {};
  pass("6. Batch output finished geometry", batchMeta.width === FINISHED_WIDTH && batchMeta.height === FINISHED_HEIGHT, `${batchMeta.width}x${batchMeta.height}`);

  pass(
    "6. Composer front matches batch front (same stack)",
    hashBuffer(batchFrontBuf) === hashDataUrl(boostOnSrc),
    `composer=${hashDataUrl(boostOnSrc)} batch=${hashBuffer(batchFrontBuf)}`,
  );

  await firstComposer.getByRole("button", { name: "Back", exact: true }).click();
  const composerBackAfterBatch = await waitForImageChange(composerImg, boostOnSrc);

  const batchPanel = page.locator(".pzw-section.pzw-panel").filter({ hasText: "Preview" });
  await batchPanel.getByRole("button", { name: "Back", exact: true }).click();
  await page.waitForTimeout(600);
  const batchBackUrl = await batchPreviewImg.getAttribute("src");
  const batchBackBuf = batchBackUrl ? await fetchBuffer(page, batchBackUrl) : Buffer.alloc(0);
  const batchSerial = ((await batchPanel.locator(".ps-preview__serial").textContent()) ?? "").replace(/^No\.\s*/, "").trim() || "0001";

  // Live composer preview always renders back with placeholder serial 0001.
  const composerUsesPlaceholder = hashDataUrl(composerBackAfterBatch) === hashDataUrl(backSrc);
  pass(
    "6. Composer live preview back uses placeholder serial 0001",
    composerUsesPlaceholder,
    `composer=${hashDataUrl(composerBackAfterBatch)} placeholder=${hashDataUrl(backSrc)} batchSerial=${batchSerial}`,
  );

  const pipelineHash = execSync(
    `NODE_OPTIONS="-r /tmp/stub-server-only.cjs" npx tsx --eval "(async () => {
      const { createHash } = await import('crypto');
      const { finishBobosPassBack, readGenerationSidePng } = await import('./lib/bobos/project-zero/pass-production.ts');
      const { applyPassArtworkAdjustments } = await import('./lib/bobos/project-zero/pass-artwork-adjustments.server.ts');
      const { getProject } = await import('./lib/bobos/project-zero/store.ts');
      const { loadPassWorkspaceHistory, loadPassWorkspaceAdjustments } = await import('./lib/bobos/project-zero/pass-workspace-store.ts');
      const { passQrUrl } = await import('./lib/ops/event-studio/pass-studio/qr.ts');
      const projectId = '${PROJECT_ID}';
      const serial = '${batchSerial}';
      const history = await loadPassWorkspaceHistory(projectId);
      const generationId = history.general.at(-1)?.generationId;
      const project = await getProject(projectId);
      const adj = (await loadPassWorkspaceAdjustments(projectId)).general;
      const overlay = { venue: project.sharedContext.venue, series: project.sharedContext.title, theme: project.sharedContext.theme, schedule: project.sharedContext.date, slug: 'general' };
      const raw = await readGenerationSidePng(generationId, 'back');
      const adjusted = await applyPassArtworkAdjustments(raw, adj);
      const buf = await finishBobosPassBack({ rawBackPng: adjusted, qrUrl: passQrUrl(serial), serial, overlay });
      console.log(createHash('sha256').update(buf).digest('hex').slice(0,16));
    })().catch((e) => { console.error(e); process.exit(1); });"`,
    { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  )
    .trim()
    .split("\n")
    .pop()
    ?.trim();

  pass(
    "6. Batch back matches production compose pipeline",
    pipelineHash === hashBuffer(batchBackBuf),
    `pipeline=${pipelineHash} batch=${hashBuffer(batchBackBuf)} serial=${batchSerial}`,
  );

  pass(
    "6. Batch preview QR URL matches serial",
    (await decodeQrFromPng(batchBackBuf))?.endsWith(`/pass/${batchSerial}`) ?? false,
    `serial=${batchSerial}`,
  );

  const qrUrl = await decodeQrFromPng(batchBackBuf);
  pass("8. QR decodes from batch back", qrUrl?.includes("retroverse.live/pass/") ?? false, qrUrl ?? "decode failed");

  const inkRatio = await serialZoneHasInk(batchBackBuf, SERIAL_RESERVE);
  pass("9. Serial stamp ink in reserve zone", inkRatio > 0.02, `dark pixel ratio ${(inkRatio * 100).toFixed(2)}%`);

  const buildSheetsBtn = page.getByRole("button", { name: /Build Print Sheets|Rebuild Print Sheets/i });
  if (await buildSheetsBtn.count()) {
    await buildSheetsBtn.first().click();
    await page.waitForSelector(".pzw-sheets__image", { timeout: 120000 });
    pass("7. Build Print Sheets renders sheets", (await page.locator(".pzw-sheets__image").count()) >= 2, `${await page.locator(".pzw-sheets__image").count()} images`);
  } else {
    pass("7. Build Print Sheets renders sheets", false, "button not found");
  }

  const actionErrors = consoleErrors.filter((e) =>
    /Server Action|server action|Failed to fetch|previewBobosPassCompose|generateBobosPassBatch|buildBobosPrintSheets/i.test(e),
  );
  const benignNetworkFailures = networkFailures.filter(
    (e) => !(e.includes("ERR_ABORTED") && e.includes("/workspace/passes")),
  );
  pass("10. No Server Action / compose errors", actionErrors.length === 0, actionErrors.join(" | ") || "clean");
  pass("10. No console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | ") || "clean");
  pass("10. No network failures", benignNetworkFailures.length === 0, benignNetworkFailures.slice(0, 3).join(" | ") || "clean");

  const outPath = join(process.cwd(), "tools", "verify-pass-composer-results.json");
  await writeFile(outPath, JSON.stringify({ projectId: PROJECT_ID, url: URL, results, consoleErrors, networkFailures }, null, 2));
  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.error("Failures:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
