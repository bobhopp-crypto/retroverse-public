import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
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

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serialOverlaySvg(serial: string): string {
  const cx = SERIAL_X0 + SERIAL_WIDTH_PX / 2;
  const cy = SERIAL_Y0 + SERIAL_HEIGHT_PX / 2 + 4;
  return [
    `<svg width="1024" height="1536" xmlns="http://www.w3.org/2000/svg">`,
    `<text x="${cx}" y="${cy}" font-family='Helvetica Neue, Arial, sans-serif' font-size="20" font-weight="700"`,
    `letter-spacing="2" text-anchor="middle" fill="#2d2d2d">${escapeXml(serial)}</text>`,
    `</svg>`,
  ].join("");
}

/** Export — front unchanged; serial + high-res QR composited on back only. */
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

  await sharp(args.frontPng).png().toFile(frontPath);

  const serialSvg = serialOverlaySvg(args.serialNumber);
  const qrBackPath = join(args.exportDir, "final-back-qr.png");

  await compositeQrOntoBackPng({
    backSrc: args.backPng,
    backPath: qrBackPath,
    qrUrl: args.qrUrl,
  });

  await sharp(qrBackPath)
    .composite([{ input: Buffer.from(serialSvg), top: 0, left: 0 }])
    .png()
    .toFile(backPath);

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

export async function writeVNextExportZip(args: {
  exportDir: string;
  zipFilename: string;
}): Promise<string> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const zipPath = join(args.exportDir, "..", args.zipFilename);

  if (process.platform === "darwin") {
    await execFileAsync("zip", ["-j", zipPath, "final-front.png", "final-back.png"], {
      cwd: args.exportDir,
    });
  }

  return zipPath;
}
