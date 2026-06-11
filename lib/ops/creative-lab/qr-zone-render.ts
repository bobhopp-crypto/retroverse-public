import jsQR from "jsqr";
import QRCode from "qrcode";
import sharp from "sharp";

import { QR_ZONE, qrPhysicalSizeIn } from "./pass-layout";

/** ISO minimum quiet zone in modules. */
export const QR_QUIET_MODULES_ISO = 4;

/** Matrix should occupy 85–90% of reserved safe area (print scan reliability). */
export const QR_MIN_MATRIX_FILL_PERCENT = 85;
export const QR_MAX_MATRIX_FILL_PERCENT = 90;

/** @deprecated Use QR_MIN_MATRIX_FILL_PERCENT */
export const QR_MIN_ZONE_FILL_PERCENT = QR_MIN_MATRIX_FILL_PERCENT;

function rgbaToJsQrPixels(data: Buffer, width: number, height: number, channels: number): Uint8ClampedArray {
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

/** Decode QR from PNG buffer — used for export verification and render tuning. */
export async function decodeQrFromPngBuffer(
  png: Buffer,
  extract?: { left: number; top: number; width: number; height: number },
): Promise<string | null> {
  let pipeline = sharp(png);
  if (extract) {
    pipeline = pipeline.extract(extract);
  }
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = rgbaToJsQrPixels(data, info.width, info.height, info.channels);
  return jsQR(pixels, info.width, info.height)?.data ?? null;
}

export function qrModulesPresent(audit: QrZoneAudit): boolean {
  return audit.renderedMatrixPx.width > 0 && audit.renderedMatrixPx.height > 0;
}

export type QrZoneAudit = {
  reservedZonePx: { width: number; height: number };
  /** Black module bounding box in the exported zone extract. */
  renderedMatrixPx: { width: number; height: number };
  /** Matrix + quiet zone bounding box. */
  renderedQrImagePx: { width: number; height: number };
  /** QR image (matrix + quiet) vs reserved zone. */
  zoneFillPercent: number;
  /** Black modules vs reserved zone. */
  matrixFillPercent: number;
  physicalMatrixWidthIn: number;
  physicalMatrixHeightIn: number;
  physicalQrImageWidthIn: number;
  physicalQrImageHeightIn: number;
  quietModulesUsed: number;
  modulePx: number;
  moduleCount: number;
};

type RgbaBuffer = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
};

type QrRenderCandidate = {
  png: Buffer;
  audit: QrZoneAudit;
  moduleCount: number;
  quietModules: number;
};

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Detect black module bounds in a square RGBA buffer. */
export function measureBlackModuleBounds(buf: RgbaBuffer): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} | null {
  const { data, width, height, channels } = buf;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      if (luminance(r, g, b) < 128) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function auditQrZonePixels(
  buf: RgbaBuffer,
  zoneSize: number,
  moduleCount: number,
  quietModules: number,
): QrZoneAudit {
  const reservedZonePx = { width: zoneSize, height: zoneSize };
  const matrix = measureBlackModuleBounds(buf);

  if (!matrix) {
    return {
      reservedZonePx,
      renderedMatrixPx: { width: 0, height: 0 },
      renderedQrImagePx: { width: 0, height: 0 },
      zoneFillPercent: 0,
      matrixFillPercent: 0,
      physicalMatrixWidthIn: 0,
      physicalMatrixHeightIn: 0,
      physicalQrImageWidthIn: 0,
      physicalQrImageHeightIn: 0,
      quietModulesUsed: quietModules,
      modulePx: 0,
      moduleCount,
    };
  }

  const modulePx = matrix.width / moduleCount;
  const quietPx = quietModules * modulePx;
  const qrImageWidth = Math.min(zoneSize, Math.round(matrix.width + 2 * quietPx));
  const qrImageHeight = Math.min(zoneSize, Math.round(matrix.height + 2 * quietPx));

  const matrixFillPercent = Math.min(
    (matrix.width / zoneSize) * 100,
    (matrix.height / zoneSize) * 100,
  );
  const zoneFillPercent = Math.min(
    (qrImageWidth / zoneSize) * 100,
    (qrImageHeight / zoneSize) * 100,
  );

  return {
    reservedZonePx,
    renderedMatrixPx: { width: matrix.width, height: matrix.height },
    renderedQrImagePx: { width: qrImageWidth, height: qrImageHeight },
    zoneFillPercent,
    matrixFillPercent,
    physicalMatrixWidthIn: qrPhysicalSizeIn(matrix.width),
    physicalMatrixHeightIn: qrPhysicalSizeIn(matrix.height),
    physicalQrImageWidthIn: qrPhysicalSizeIn(qrImageWidth),
    physicalQrImageHeightIn: qrPhysicalSizeIn(qrImageHeight),
    quietModulesUsed: quietModules,
    modulePx,
    moduleCount,
  };
}

async function readRgba(buffer: Buffer): Promise<RgbaBuffer> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/** Render scannable QR PNG — square zone, quiet margin in modules (qrcode library). */
export async function renderQrPngForZone(
  url: string,
  zoneSize: number,
  quietModules: number,
): Promise<{ png: Buffer; moduleCount: number }> {
  const trimmed = url.trim();
  const qr = QRCode.create(trimmed, { errorCorrectionLevel: "H" });
  const moduleCount = qr.modules.size;
  const png = await QRCode.toBuffer(trimmed, {
    errorCorrectionLevel: "H",
    type: "png",
    width: zoneSize,
    margin: quietModules,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return { png, moduleCount };
}

export async function auditQrPngBufferWithModules(
  png: Buffer,
  zoneSize: number,
  moduleCount: number,
  quietModules: number,
): Promise<QrZoneAudit> {
  const rgba = await readRgba(png);
  return auditQrZonePixels(rgba, zoneSize, moduleCount, quietModules);
}

/** Pick quiet-module count — must decode; prefer 85–90% matrix fill and ISO quiet zone. */
export async function selectOptimalQuietModules(
  url: string,
  zoneSize: number,
): Promise<QrRenderCandidate> {
  let bestDecodable: QrRenderCandidate | null = null;
  let bestInRange: QrRenderCandidate | null = null;

  for (let quiet = QR_QUIET_MODULES_ISO; quiet >= 1; quiet--) {
    const { png, moduleCount } = await renderQrPngForZone(url, zoneSize, quiet);
    const decoded = await decodeQrFromPngBuffer(png);
    if (!decoded) continue;

    const audit = await auditQrPngBufferWithModules(png, zoneSize, moduleCount, quiet);
    const candidate: QrRenderCandidate = { png, audit, moduleCount, quietModules: quiet };

    if (!bestDecodable || audit.matrixFillPercent > bestDecodable.audit.matrixFillPercent) {
      bestDecodable = candidate;
    }

    if (
      audit.matrixFillPercent >= QR_MIN_MATRIX_FILL_PERCENT &&
      audit.matrixFillPercent <= QR_MAX_MATRIX_FILL_PERCENT
    ) {
      if (!bestInRange || quiet > bestInRange.quietModules) {
        bestInRange = candidate;
      }
    }
  }

  if (!bestDecodable) {
    throw new Error("qr_render_failed: no decodable QR candidate for reserved zone");
  }

  return bestInRange ?? bestDecodable;
}

/**
 * Generate QR PNG that nearly fills the reserved zone.
 * Targets 85–90% matrix fill while preserving quiet zone when possible.
 */
export async function generateZoneFillingQrPng(
  url: string,
  zoneSize: number,
): Promise<{ png: Buffer; audit: QrZoneAudit; moduleCount: number; quietModules: number }> {
  const picked = await selectOptimalQuietModules(url, zoneSize);
  return {
    png: picked.png,
    audit: picked.audit,
    moduleCount: picked.moduleCount,
    quietModules: picked.quietModules,
  };
}

/** Audit QR in the reserved zone of an exported back PNG. */
export async function auditExportedQrZone(
  backPngPath: string,
  zoneSize: number = QR_ZONE.size,
  zoneLeft: number = QR_ZONE.left,
  zoneTop: number = QR_ZONE.top,
  quietModulesUsed: number = QR_QUIET_MODULES_ISO,
): Promise<QrZoneAudit> {
  const { data, info } = await sharp(backPngPath)
    .extract({ left: zoneLeft, top: zoneTop, width: zoneSize, height: zoneSize })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba: RgbaBuffer = {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };

  const matrix = measureBlackModuleBounds(rgba);
  if (!matrix) {
    return auditQrZonePixels(rgba, zoneSize, 0, quietModulesUsed);
  }

  const moduleCount = estimateModuleCount(matrix.width, zoneSize, quietModulesUsed);
  return auditQrZonePixels(rgba, zoneSize, moduleCount, quietModulesUsed);
}

function estimateModuleCount(matrixWidthPx: number, zoneSize: number, quietModules: number): number {
  let bestN = 29;
  let bestDelta = Infinity;
  for (let n = 21; n <= 177; n++) {
    const modulePx = zoneSize / (n + 2 * quietModules);
    const expected = n * modulePx;
    const delta = Math.abs(expected - matrixWidthPx);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestN = n;
    }
  }
  return bestN;
}

export function emptyQrZoneAudit(zoneSize: number = QR_ZONE.size): QrZoneAudit {
  return {
    reservedZonePx: { width: zoneSize, height: zoneSize },
    renderedMatrixPx: { width: 0, height: 0 },
    renderedQrImagePx: { width: 0, height: 0 },
    zoneFillPercent: 0,
    matrixFillPercent: 0,
    physicalMatrixWidthIn: 0,
    physicalMatrixHeightIn: 0,
    physicalQrImageWidthIn: 0,
    physicalQrImageHeightIn: 0,
    quietModulesUsed: QR_QUIET_MODULES_ISO,
    modulePx: 0,
    moduleCount: 0,
  };
}

export function qrMatrixFillInRange(audit: QrZoneAudit): boolean {
  return (
    audit.matrixFillPercent >= QR_MIN_MATRIX_FILL_PERCENT &&
    audit.matrixFillPercent <= QR_MAX_MATRIX_FILL_PERCENT
  );
}

export function qrZoneAuditNotes(audit: QrZoneAudit): string[] {
  const fillOk = qrMatrixFillInRange(audit);
  return [
    `Reserved QR zone: ${audit.reservedZonePx.width}×${audit.reservedZonePx.height}px`,
    `Rendered matrix: ${audit.renderedMatrixPx.width}×${audit.renderedMatrixPx.height}px (${audit.matrixFillPercent.toFixed(1)}% of zone)`,
    `Target matrix fill: ${QR_MIN_MATRIX_FILL_PERCENT}–${QR_MAX_MATRIX_FILL_PERCENT}% — ${fillOk ? "PASS" : "WARN"}`,
    `Rendered QR image: ${audit.renderedQrImagePx.width}×${audit.renderedQrImagePx.height}px (${audit.zoneFillPercent.toFixed(1)}% of zone)`,
    `Physical matrix: ${audit.physicalMatrixWidthIn.toFixed(2)}" × ${audit.physicalMatrixHeightIn.toFixed(2)}"`,
    `Physical QR image: ${audit.physicalQrImageWidthIn.toFixed(2)}" × ${audit.physicalQrImageHeightIn.toFixed(2)}"`,
    `Quiet modules: ${audit.quietModulesUsed} · module pitch: ${audit.modulePx.toFixed(2)}px`,
  ];
}
