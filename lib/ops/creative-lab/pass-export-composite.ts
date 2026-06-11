import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import jsQR from "jsqr";
import sharp from "sharp";

import { creativeLabProjectDir } from "./paths";
import {
  PASS_PRINT_WIDTH_IN,
  PASS_WIDTH,
  QR_PRINT_MIN_IN,
  QR_PRINT_PREFERRED_MIN_IN,
  QR_ZONE,
} from "./pass-layout";
import {
  auditExportedQrZone,
  auditQrPngBufferWithModules,
  emptyQrZoneAudit,
  generateZoneFillingQrPng,
  QR_MAX_MATRIX_FILL_PERCENT,
  QR_MIN_MATRIX_FILL_PERCENT,
  qrMatrixFillInRange,
  qrZoneAuditNotes,
  selectOptimalQuietModules,
  type QrZoneAudit,
} from "./qr-zone-render";
import type { CreativeLabProjectFile } from "./types";

export type { QrZoneAudit };

export type QrVerificationResult = {
  /** PASS only when QR decodes from the final exported PNG. */
  ok: boolean;
  decodedUrl: string | null;
  expectedUrl: string;
  notes: string[];
  physicalWidthIn: number;
  physicalHeightIn: number;
  pixelSize: { width: number; height: number };
  minSizeIn: number;
  sizePass: boolean;
  decodePass: boolean;
  matrixFillPercent: number;
  matrixFillPass: boolean;
  matrixFillWarning: boolean;
  printSizeWarning: boolean;
  /** Measured from exported back PNG — not editor preview. */
  zoneAudit: QrZoneAudit;
};

/** Placeholder when export has not been verified yet. */
export function emptyQrVerification(expectedUrl: string): QrVerificationResult {
  const zoneAudit = emptyQrZoneAudit();
  return {
    ok: false,
    decodedUrl: null,
    expectedUrl,
    notes: [],
    physicalWidthIn: 0,
    physicalHeightIn: 0,
    pixelSize: { width: 0, height: 0 },
    minSizeIn: QR_PRINT_MIN_IN,
    sizePass: false,
    decodePass: false,
    matrixFillPercent: 0,
    matrixFillPass: false,
    matrixFillWarning: true,
    printSizeWarning: true,
    zoneAudit,
  };
}

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

/** Export-only — SVG matrix → Sharp PNG, 85–90% fill with auto quiet zone. */
export async function generateQrPngBuffer(url: string, targetSize: number): Promise<Buffer> {
  const { png } = await generateZoneFillingQrPng(url, targetSize);
  return png;
}

function normalizeUrlForCompare(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, "")}${u.search}`;
  } catch {
    return url.trim();
  }
}

function rgbaToJsQrPixels(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * channels;
      const dst = (y * width + x) * 4;
      pixels[dst] = data[src] ?? 0;
      pixels[dst + 1] = data[src + 1] ?? 0;
      pixels[dst + 2] = data[src + 2] ?? 0;
      pixels[dst + 3] = 255;
    }
  }
  return pixels;
}

async function decodeQrFromPng(pngPath: string, extract?: { left: number; top: number; width: number; height: number }) {
  let pipeline = sharp(pngPath);
  if (extract) {
    pipeline = pipeline.extract(extract);
  }
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = rgbaToJsQrPixels(data, info.width, info.height, info.channels);
  return jsQR(pixels, info.width, info.height);
}

/**
 * Composite QR onto back, audit exported PNG, tune quiet zone for 85–90% matrix fill.
 */
export async function compositeQrOntoBackBuffer(args: {
  backSrc: string | Buffer;
  qrUrl: string;
}): Promise<{ buffer: Buffer; zoneAudit: QrZoneAudit; quietModules: number }> {
  const zoneSize = QR_ZONE.size;
  const picked = await selectOptimalQuietModules(args.qrUrl, zoneSize);
  const base = typeof args.backSrc === "string" ? sharp(args.backSrc) : sharp(args.backSrc);
  const buffer = await base
    .composite([{ input: picked.png, left: QR_ZONE.left, top: QR_ZONE.top }])
    .png()
    .toBuffer();
  const zoneAudit = await auditQrPngBufferWithModules(buffer, zoneSize, picked.moduleCount, picked.quietModules);
  return { buffer, zoneAudit, quietModules: picked.quietModules };
}

export async function compositeQrOntoBackPng(args: {
  backSrc: string | Buffer;
  backPath: string;
  qrUrl: string;
}): Promise<{ zoneAudit: QrZoneAudit; quietModules: number }> {
  const { buffer, zoneAudit, quietModules } = await compositeQrOntoBackBuffer({
    backSrc: args.backSrc,
    qrUrl: args.qrUrl,
  });
  await sharp(buffer).png().toFile(args.backPath);
  const zoneAuditFile = await auditExportedQrZone(args.backPath, QR_ZONE.size, QR_ZONE.left, QR_ZONE.top, quietModules);
  return { zoneAudit: zoneAuditFile, quietModules };
}

/** Post-export validation — audit exported PNG, decode QR, report physical size. */
export async function verifyQrInComposite(
  backPngPath: string,
  expectedUrl: string,
): Promise<QrVerificationResult> {
  const notes: string[] = [];
  const expected = normalizeUrlForCompare(expectedUrl);
  const zoneAudit = await auditExportedQrZone(backPngPath);

  notes.push(...qrZoneAuditNotes(zoneAudit));

  const pixelWidth = zoneAudit.renderedQrImagePx.width;
  const pixelHeight = zoneAudit.renderedQrImagePx.height;
  const physicalWidthIn = zoneAudit.physicalQrImageWidthIn;
  const physicalHeightIn = zoneAudit.physicalQrImageHeightIn;
  const minSizeIn = QR_PRINT_MIN_IN;
  const sizePass =
    physicalWidthIn >= minSizeIn - 0.001 && physicalHeightIn >= minSizeIn - 0.001;
  const printSizeWarning = physicalWidthIn < QR_PRINT_PREFERRED_MIN_IN - 0.001;
  const matrixFillPercent = zoneAudit.matrixFillPercent;
  const matrixFillPass = qrMatrixFillInRange(zoneAudit);
  const matrixFillWarning = matrixFillPercent < QR_MIN_MATRIX_FILL_PERCENT;

  const qrMetrics = {
    physicalWidthIn,
    physicalHeightIn,
    pixelSize: { width: pixelWidth, height: pixelHeight },
    minSizeIn,
    sizePass,
    matrixFillPercent,
    matrixFillPass,
    matrixFillWarning,
    printSizeWarning,
    zoneAudit,
  };

  notes.push(`Print canvas: ${PASS_WIDTH}px = ${PASS_PRINT_WIDTH_IN}" wide`);
  notes.push(`Minimum required: ${minSizeIn}" × ${minSizeIn}"`);
  notes.push(`Preferred print: ${QR_PRINT_PREFERRED_MIN_IN}"+ for lanyard scan distance`);
  notes.push(`Size check: ${sizePass ? "PASS" : "FAIL"}`);
  if (printSizeWarning) {
    notes.push(`PRINT WARNING: QR physical size below ${QR_PRINT_PREFERRED_MIN_IN}" — may fail lanyard scan`);
  }
  notes.push(
    `Matrix fill: ${matrixFillPercent.toFixed(1)}% (target ${QR_MIN_MATRIX_FILL_PERCENT}–${QR_MAX_MATRIX_FILL_PERCENT}%) — ${matrixFillPass ? "PASS" : "WARN"}`,
  );
  notes.push(
    `Zone fill: ${zoneAudit.zoneFillPercent.toFixed(1)}% (matrix ${zoneAudit.matrixFillPercent.toFixed(1)}%)`,
  );

  let decodedUrl: string | null = null;
  let decodePass = false;

  try {
    let code = await decodeQrFromPng(backPngPath);
    if (!code?.data) {
      code = await decodeQrFromPng(backPngPath, {
        left: QR_ZONE.left,
        top: QR_ZONE.top,
        width: QR_ZONE.size,
        height: QR_ZONE.size,
      });
    }

    if (!code?.data) {
      notes.push("Decode check: FAIL — QR not readable in exported back PNG");
      notes.push("Zone may be obscured or AI drew over reserved area");
      return {
        ok: false,
        decodedUrl: null,
        expectedUrl,
        notes,
        ...qrMetrics,
        decodePass: false,
      };
    }

    decodedUrl = code.data;
    const decoded = normalizeUrlForCompare(code.data);
    decodePass = decoded === expected || code.data.trim() === expectedUrl.trim();

    notes.push(`Decoded: ${code.data}`);
    notes.push(`Expected: ${expectedUrl}`);
    notes.push(`Decode check: ${decodePass ? "PASS" : "FAIL"}`);
    notes.push("QR inserted programmatically — pure black on white, no stylization");

    if (!decodePass) {
      notes.push("Decoded URL does not match expected QR URL");
    }

    const ok = decodePass;
    notes.push(`Overall: ${ok ? "PASS" : "FAIL"} (decode-only)`);

    return {
      ok,
      decodedUrl,
      expectedUrl,
      notes,
      ...qrMetrics,
      decodePass,
    };
  } catch (e) {
    notes.push(e instanceof Error ? e.message : "QR verification error");
    notes.push("Overall: FAIL");
    return {
      ok: false,
      decodedUrl: null,
      expectedUrl,
      notes,
      ...qrMetrics,
      decodePass: false,
    };
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
  await compositeQrOntoBackPng({ backSrc, backPath, qrUrl: args.qrUrl });

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
