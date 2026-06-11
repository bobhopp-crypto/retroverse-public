import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import jsQR from "jsqr";
import QRCode from "qrcode";
import sharp from "sharp";

import { creativeLabProjectDir } from "./paths";
import { QR_ZONE } from "./pass-layout";
import type { CreativeLabProjectFile } from "./types";

export type QrVerificationResult = {
  ok: boolean;
  decodedUrl: string | null;
  expectedUrl: string;
  notes: string[];
};

export type PassExportReport = {
  exportedAt: string;
  projectId: string;
  qrUrl: string;
  front: { filename: string; path: string };
  back: { filename: string; path: string };
  package: { filename: string; path: string; rel: string };
  qrVerification: QrVerificationResult;
  textGovernance: {
    note: string;
    frontValidatedAt?: string;
    backValidatedAt?: string;
  };
};

export async function generateQrPngBuffer(url: string, size: number): Promise<Buffer> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("QR URL is required for export compositing");
  return QRCode.toBuffer(trimmed, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

function normalizeUrlForCompare(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, "")}${u.search}`;
  } catch {
    return url.trim();
  }
}

/** Decode QR from composited back PNG and verify URL matches. */
export async function verifyQrInComposite(
  backPngPath: string,
  expectedUrl: string,
): Promise<QrVerificationResult> {
  const notes: string[] = [];
  const expected = normalizeUrlForCompare(expectedUrl);

  try {
    const { data, info } = await sharp(backPngPath)
      .extract({
        left: QR_ZONE.left,
        top: QR_ZONE.top,
        width: QR_ZONE.size,
        height: QR_ZONE.size,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

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

    const code = jsQR(pixels, info.width, info.height);
    if (!code?.data) {
      notes.push("QR decode failed — zone may be obscured or AI drew over reserved area");
      return { ok: false, decodedUrl: null, expectedUrl, notes };
    }

    const decoded = normalizeUrlForCompare(code.data);
    notes.push(`QR decoded: ${code.data}`);
    notes.push(`Expected: ${expectedUrl}`);
    notes.push("QR inserted programmatically after generation (not AI-generated)");

    const ok = decoded === expected || code.data.trim() === expectedUrl.trim();
    if (!ok) {
      notes.push("Decoded URL does not match expected QR URL");
    } else {
      notes.push("QR verification passed — scannable and URL matches");
    }

    return { ok, decodedUrl: code.data, expectedUrl, notes };
  } catch (e) {
    notes.push(e instanceof Error ? e.message : "QR verification error");
    return { ok: false, decodedUrl: null, expectedUrl, notes };
  }
}

/** Composite real scannable QR onto approved back PNG. Front is copied unchanged. */
export async function compositePassExportPair(args: {
  project: CreativeLabProjectFile;
  frontAssetId: string;
  backAssetId: string;
  qrUrl: string;
  exportDir: string;
  frontOutName: string;
  backOutName: string;
}): Promise<{ frontPath: string; backPath: string; qrVerification: QrVerificationResult }> {
  const projectId = args.project.folderSlug || args.project.id;
  const root = creativeLabProjectDir(projectId);
  await mkdir(args.exportDir, { recursive: true });

  const frontAsset = args.project.assets.find((a) => a.id === args.frontAssetId);
  const backAsset = args.project.assets.find((a) => a.id === args.backAssetId);
  if (!frontAsset?.filePath?.endsWith(".png") || !backAsset?.filePath?.endsWith(".png")) {
    throw new Error("Front and back PNG assets are required for export compositing");
  }

  const frontSrc = join(root, frontAsset.filePath);
  const backSrc = join(root, backAsset.filePath);
  if (!existsSync(frontSrc) || !existsSync(backSrc)) {
    throw new Error("Export source PNG files are missing on disk");
  }

  const frontPath = join(args.exportDir, args.frontOutName);
  const backPath = join(args.exportDir, args.backOutName);

  await copyFile(frontSrc, frontPath);

  const qrBuffer = await generateQrPngBuffer(args.qrUrl, QR_ZONE.size);
  await sharp(backSrc)
    .composite([{ input: qrBuffer, left: QR_ZONE.left, top: QR_ZONE.top }])
    .png()
    .toFile(backPath);

  const qrVerification = await verifyQrInComposite(backPath, args.qrUrl);
  if (!qrVerification.ok) {
    console.warn("[cl-export:qr] verification failed", qrVerification);
  }

  return { frontPath, backPath, qrVerification };
}

export async function writePassExportReport(
  exportDir: string,
  report: PassExportReport,
): Promise<string> {
  const reportPath = join(exportDir, "export-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}
