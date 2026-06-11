import QRCode from "qrcode";
import sharp from "sharp";

import { QR_ZONE, qrPhysicalSizeIn } from "./pass-layout";
import { assertWellFormedSvg } from "./svg-validate";

/** ISO minimum quiet zone in modules. */
export const QR_QUIET_MODULES_ISO = 4;

/** Matrix should occupy 85–90% of reserved safe area (print scan reliability). */
export const QR_MIN_MATRIX_FILL_PERCENT = 85;
export const QR_MAX_MATRIX_FILL_PERCENT = 90;

/** @deprecated Use QR_MIN_MATRIX_FILL_PERCENT */
export const QR_MIN_ZONE_FILL_PERCENT = QR_MIN_MATRIX_FILL_PERCENT;

const QR_RENDER_SCALE = 4;

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

function buildQrSvg(url: string, zoneSize: number, quietModules: number): { svg: string; moduleCount: number } {
  const qr = QRCode.create(url.trim(), { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const modulePx = zoneSize / (n + 2 * quietModules);
  const offset = quietModules * modulePx;
  const rects: string[] = [];

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) {
        rects.push(
          `<rect x="${(offset + x * modulePx).toFixed(4)}" y="${(offset + y * modulePx).toFixed(4)}" width="${modulePx.toFixed(4)}" height="${modulePx.toFixed(4)}" fill="#000000"/>`,
        );
      }
    }
  }

  const svg = [
    `<svg width="${zoneSize}" height="${zoneSize}" viewBox="0 0 ${zoneSize} ${zoneSize}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="${zoneSize}" height="${zoneSize}" fill="#ffffff"/>`,
    ...rects,
    `</svg>`,
  ].join("");

  assertWellFormedSvg(svg, "qr-matrix");
  return { svg, moduleCount: n };
}

/** Render QR to exactly fill zoneSize × zoneSize; quiet zone in modules, matrix maximized. */
export async function renderQrPngForZone(
  url: string,
  zoneSize: number,
  quietModules: number,
): Promise<{ png: Buffer; moduleCount: number }> {
  const { svg, moduleCount } = buildQrSvg(url, zoneSize * QR_RENDER_SCALE, quietModules);
  const hiRes = await sharp(Buffer.from(svg)).png().toBuffer();
  const png = await sharp(hiRes)
    .resize(zoneSize, zoneSize, { kernel: "nearest" })
    .png()
    .toBuffer();
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

/** Pick quiet-module count: 85–90% matrix fill, prefer ISO quiet zone when in range. */
export async function selectOptimalQuietModules(
  url: string,
  zoneSize: number,
): Promise<QrRenderCandidate> {
  let best: QrRenderCandidate | null = null;
  let bestInRange: QrRenderCandidate | null = null;

  for (let quiet = QR_QUIET_MODULES_ISO; quiet >= 1; quiet--) {
    const { png, moduleCount } = await renderQrPngForZone(url, zoneSize, quiet);
    const audit = await auditQrPngBufferWithModules(png, zoneSize, moduleCount, quiet);
    const candidate: QrRenderCandidate = { png, audit, moduleCount, quietModules: quiet };

    if (!best || audit.matrixFillPercent > best.audit.matrixFillPercent) {
      best = candidate;
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

  return bestInRange ?? best!;
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
