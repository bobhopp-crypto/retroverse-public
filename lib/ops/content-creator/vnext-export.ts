import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  compositeQrOntoBackBuffer,
  compositeQrOntoBackPng,
  verifyQrInComposite,
  type QrVerificationResult,
} from "@/lib/ops/creative-lab/pass-export-composite";
import type { SerialStampOverlay } from "@/lib/ops/content-creator/pass-numbering";
import {
  PASS_HEIGHT,
  PASS_WIDTH,
  SERIAL_HEIGHT_PX,
  SERIAL_WIDTH_PX,
  SERIAL_X0,
  SERIAL_Y0,
} from "@/lib/ops/creative-lab/pass-layout";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";
import sharp from "sharp";

import { assertWellFormedSvg } from "@/lib/ops/creative-lab/svg-validate";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function serialStampOverlaySvg(overlay: SerialStampOverlay): {
  svg: string;
  left: number;
  top: number;
} {
  const isWriteIn = overlay.mode === "write_in";
  const fill = isWriteIn ? "#5c5c5c" : "#2d2d2d";
  const fontSize = isWriteIn ? 18 : 20;
  const weight = isWriteIn ? 600 : 700;
  const letterSpacing = isWriteIn ? 1.5 : 2;
  const opacity = isWriteIn ? 0.72 : 1;

  const localX = SERIAL_WIDTH_PX / 2;
  const localY = SERIAL_HEIGHT_PX / 2 + 4;
  const svg = [
    `<svg width="${SERIAL_WIDTH_PX}" height="${SERIAL_HEIGHT_PX}" xmlns="http://www.w3.org/2000/svg">`,
    `<text x="${localX}" y="${localY}" font-family="Helvetica Neue, Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" letter-spacing="${letterSpacing}" text-anchor="middle" fill="${fill}" opacity="${opacity}">${escapeXml(overlay.text)}</text>`,
    `</svg>`,
  ].join("");
  assertWellFormedSvg(svg, "serial-stamp-overlay");
  return { svg, left: SERIAL_X0, top: SERIAL_Y0 };
}

/** @deprecated Use serialStampOverlaySvg */
export function serialOverlaySvg(serial: string): string {
  return serialStampOverlaySvg({ mode: "printed", text: serial }).svg;
}

export async function compositeVNextFrontPng(frontPng: Buffer, outPath: string): Promise<void> {
  const { dirname } = await import("path");
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(frontPng).png().toFile(outPath);
}

/** Export back — QR (SVG→Sharp) + serial / write-in stamp in reserved zone. */
export async function compositeVNextBackPng(args: {
  backPng: Buffer;
  qrUrl: string;
  stamp: SerialStampOverlay;
}): Promise<Buffer> {
  const { buffer: withQr } = await compositeQrOntoBackBuffer({
    backSrc: args.backPng,
    qrUrl: args.qrUrl,
  });
  const stamp = serialStampOverlaySvg(args.stamp);
  return sharp(withQr)
    .composite([{ input: Buffer.from(stamp.svg), top: stamp.top, left: stamp.left }])
    .png()
    .toBuffer();
}

/** @deprecated Use buildVNextPrintPackage */
export async function compositeVNextExport(args: {
  frontPng: Buffer;
  backPng: Buffer;
  qrUrl: string;
  serialNumber: string;
  profile: RvbrProfile;
  exportDir: string;
}): Promise<{
  frontPath: string;
  backPath: string;
  qrVerification: QrVerificationResult;
}> {
  await mkdir(args.exportDir, { recursive: true });

  const frontPath = join(args.exportDir, "final-front.png");
  const backPath = join(args.exportDir, "final-back.png");

  await compositeVNextFrontPng(args.frontPng, frontPath);
  const backBuffer = await compositeVNextBackPng({
    backPng: args.backPng,
    qrUrl: args.qrUrl,
    stamp: { mode: "printed", text: args.serialNumber },
  });
  await writeFile(backPath, backBuffer);

  const qrVerification = await verifyQrInComposite(backPath, args.qrUrl);
  return { frontPath, backPath, qrVerification };
}

export async function writeVNextExportReport(
  exportDir: string,
  report: Record<string, unknown>,
): Promise<string> {
  const reportPath = join(exportDir, "export-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}
