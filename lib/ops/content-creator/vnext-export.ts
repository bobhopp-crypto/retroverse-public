import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  compositeQrOntoBackBuffer,
  compositeQrOntoBackPng,
  verifyQrInComposite,
  type QrVerificationResult,
} from "@/lib/ops/creative-lab/pass-export-composite";
import {
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

export function serialOverlaySvg(serial: string): string {
  const cx = SERIAL_X0 + SERIAL_WIDTH_PX / 2;
  const cy = SERIAL_Y0 + SERIAL_HEIGHT_PX / 2 + 4;
  const svg = `<svg width="1024" height="1536" xmlns="http://www.w3.org/2000/svg"><text x="${cx}" y="${cy}" font-family="Helvetica Neue, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2" text-anchor="middle" fill="#2d2d2d">${escapeXml(serial)}</text></svg>`;
  assertWellFormedSvg(svg, "serial-overlay");
  return svg;
}

export async function compositeVNextFrontPng(frontPng: Buffer, outPath: string): Promise<void> {
  const { dirname } = await import("path");
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(frontPng).png().toFile(outPath);
}

/** Export back — QR (SVG→Sharp) + serial stamp in reserved zone. */
export async function compositeVNextBackPng(args: {
  backPng: Buffer;
  qrUrl: string;
  serialLabel: string;
}): Promise<Buffer> {
  const { buffer: withQr } = await compositeQrOntoBackBuffer({
    backSrc: args.backPng,
    qrUrl: args.qrUrl,
  });
  const serialSvg = serialOverlaySvg(args.serialLabel);
  return sharp(withQr)
    .composite([{ input: Buffer.from(serialSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/** @deprecated Use buildVNextPrintPackage — kept for legacy single-pair export callers. */
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
    serialLabel: args.serialNumber,
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
