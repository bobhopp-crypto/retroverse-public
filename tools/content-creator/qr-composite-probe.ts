/**
 * Probe QR composite pipeline — detect full-canvas SVG wipe.
 * Run: npx tsx tools/content-creator/qr-composite-probe.ts
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import sharp from "sharp";

import { QR_ZONE } from "@/lib/ops/creative-lab/pass-layout";
import jsQR from "jsqr";

import { compositeQrOntoBackBuffer, verifyQrInComposite } from "@/lib/ops/creative-lab/pass-export-composite";
import {
  measureBlackModuleBounds,
  renderQrPngForZone,
  selectOptimalQuietModules,
} from "@/lib/ops/creative-lab/qr-zone-render";
import { compositeVNextBackPng } from "@/lib/ops/content-creator/vnext-export";

const url = "https://retroverse.live";
const outDir = join(process.cwd(), "reports/content-creator/qr-probe");

async function blackBounds(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const zone = await sharp(buf)
    .extract({ left: QR_ZONE.left, top: QR_ZONE.top, width: QR_ZONE.size, height: QR_ZONE.size })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const full = measureBlackModuleBounds({
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  });
  const inZone = measureBlackModuleBounds({
    data: zone.data,
    width: zone.info.width,
    height: zone.info.height,
    channels: zone.info.channels,
  });
  return { full, inZone };
}

async function jsqrDecode(buf: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(info.width * info.height * 4);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const src = (y * info.width + x) * info.channels;
      const dst = (y * info.width + x) * 4;
      pixels[dst] = data[src] ?? 0;
      pixels[dst + 1] = data[src + 1] ?? 0;
      pixels[dst + 2] = data[src + 2] ?? 0;
      pixels[dst + 3] = 255;
    }
  }
  return jsQR(pixels, info.width, info.height)?.data ?? null;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  // Simulated AI back: gray art + white QR window
  const back = await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 3,
      background: { r: 180, g: 160, b: 140 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: QR_ZONE.size,
            height: QR_ZONE.size,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        })
          .png()
          .toBuffer(),
        left: QR_ZONE.left,
        top: QR_ZONE.top,
      },
    ])
    .png()
    .toBuffer();

  const picked = await selectOptimalQuietModules(url, QR_ZONE.size);
  const qrPngDecode = await jsqrDecode(picked.png);
  const quietDecode: Record<string, string | null> = {};
  for (const q of [4, 3, 2, 1]) {
    const { png } = await renderQrPngForZone(url, QR_ZONE.size, q);
    quietDecode[`q${q}`] = await jsqrDecode(png);
  }

  const { buffer: qrOnly } = await compositeQrOntoBackBuffer({ backSrc: back, qrUrl: url });
  const stamped = await compositeVNextBackPng({
    backPng: back,
    qrUrl: url,
    stamp: { mode: "write_in", text: "Pass No. __________" },
  });

  await writeFile(join(outDir, "back-artwork.png"), back);
  await writeFile(join(outDir, "back-qr-only.png"), qrOnly);
  await writeFile(join(outDir, "back-stamped.png"), stamped);

  const qrPath = join(outDir, "back-stamped.png");
  const verify = await verifyQrInComposite(qrPath, url);
  const boundsQr = await blackBounds(qrOnly);
  const boundsFinal = await blackBounds(stamped);

  const decodeQrOnly = await jsqrDecode(qrOnly);
  const decodeStamped = await jsqrDecode(stamped);

  console.log(
    JSON.stringify(
      {
        qrZone: QR_ZONE,
        quietModules: picked.quietModules,
        quietDecode,
        qrPngDecode,
        afterQrOnly: boundsQr.inZone,
        decodeQrOnly,
        afterStamp: boundsFinal.inZone,
        decodeStamped,
        verifyOk: verify.ok,
        decodePass: verify.decodePass,
        matrixFill: verify.matrixFillPercent,
        notes: verify.notes.slice(0, 8),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
