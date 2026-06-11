import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  verifyQrInComposite,
  type QrVerificationResult,
} from "@/lib/ops/creative-lab/pass-export-composite";
import {
  QR_ZONE,
  SERIAL_HEIGHT_PX,
  SERIAL_WIDTH_PX,
  SERIAL_X0,
  SERIAL_Y0,
} from "@/lib/ops/creative-lab/pass-layout";
import { rvbrEraVisualDnaForProfile } from "@/lib/ops/content-creator/rvbr-era-visual-dna";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";
import QRCode from "qrcode";
import sharp from "sharp";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Era-compatible QR colors — solid fills only, high contrast, fully scannable. */
export function qrColorsForProfile(profile: RvbrProfile): { dark: string; light: string } {
  const dna = rvbrEraVisualDnaForProfile(profile);
  const accent = profile.visualIdentity.accent ?? dna.palette[0] ?? "#1a1a1a";
  const ink = dna.palette.find((c) => c.toLowerCase() !== "#ffffff" && c.toLowerCase() !== "#f5f0e8") ?? "#1a1a1a";
  const dark = ink.length === 7 ? ink : accent;
  return { dark, light: "#ffffff" };
}

async function generateEraQrPng(url: string, size: number, colors: { dark: string; light: string }): Promise<Buffer> {
  return QRCode.toBuffer(url.trim(), {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: colors.dark, light: colors.light },
  });
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

/** Export — front unchanged; serial + QR composited on back only. */
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

  const qrColors = qrColorsForProfile(args.profile);
  const qrBuffer = await generateEraQrPng(args.qrUrl, QR_ZONE.size, qrColors);
  const serialSvg = serialOverlaySvg(args.serialNumber);

  await sharp(args.backPng)
    .composite([
      { input: qrBuffer, top: QR_ZONE.top, left: QR_ZONE.left },
      { input: Buffer.from(serialSvg), top: 0, left: 0 },
    ])
    .png()
    .toFile(backPath);

  const qrVerification = await verifyQrInComposite(backPath, args.qrUrl);
  return { frontPath, backPath, qrVerification };
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
