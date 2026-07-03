import {
  PASS_HEIGHT,
  PASS_PRINT_HEIGHT_IN,
  PASS_PRINT_WIDTH_IN,
  PASS_WIDTH,
  QR_ZONE,
  SERIAL_HEIGHT_PX,
  SERIAL_WIDTH_PX,
  SERIAL_X0,
  SERIAL_Y0,
} from "@/lib/ops/creative-lab/pass-layout";
import type { PassQrPlacement } from "@/lib/ops/creative-lab/types";

import { PRODUCTION_LAYOUT_PRESETS } from "./production-layout-presets";

/** Normalized rect on the finished (cropped) pass canvas — center-anchored x/y. */
export type ProductionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * QR reserve — ALWAYS a square. `size` is the square's edge as a fraction of the finished
 * canvas WIDTH; both pixel dimensions derive from it, so the reserve can never distort.
 */
export type ProductionQrLayout = {
  x: number;
  y: number;
  size: number;
  padding: number;
  whiteBackgroundOpacity: number;
};

export type ProductionSerialLayout = ProductionRect & {
  fontSize: number;
  rotation: number;
  inkOpacity: number;
};

export type ProductionSafeArea = {
  enabled: boolean;
  margin: number;
};

/** BobOS-owned production overlay geometry — extensible for future elements. */
export type ProductionLayout = {
  version: 1;
  qr: ProductionQrLayout;
  serial: ProductionSerialLayout;
  safeArea: ProductionSafeArea;
};

export type ProductionLayoutReserves = {
  qr: PassQrPlacement;
  serial: { left: number; top: number; width: number; height: number };
  serialStyle: { fontSize: number; rotation: number; inkOpacity: number };
  qrWhiteBackgroundOpacity: number;
};

export type FinishedCanvasSpec = {
  widthPx: number;
  heightPx: number;
  cropLeftPx: number;
  rawWidthPx: number;
  rawHeightPx: number;
};

const TRUE_DPI = PASS_HEIGHT / PASS_PRINT_HEIGHT_IN;
export const FINISHED_CANVAS: FinishedCanvasSpec = {
  widthPx: Math.round(PASS_PRINT_WIDTH_IN * TRUE_DPI),
  heightPx: PASS_HEIGHT,
  cropLeftPx: Math.round((PASS_WIDTH - Math.round(PASS_PRINT_WIDTH_IN * TRUE_DPI)) / 2),
  rawWidthPx: PASS_WIDTH,
  rawHeightPx: PASS_HEIGHT,
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeRect(raw: Partial<ProductionRect> | undefined, fallback: ProductionRect): ProductionRect {
  return {
    x: isFiniteNumber(raw?.x) ? clamp01(raw.x) : fallback.x,
    y: isFiniteNumber(raw?.y) ? clamp01(raw.y) : fallback.y,
    width: isFiniteNumber(raw?.width) ? clamp01(raw.width) : fallback.width,
    height: isFiniteNumber(raw?.height) ? clamp01(raw.height) : fallback.height,
  };
}

/** The QR square as a center-anchored rect on the finished canvas — height fraction is
 *  derived from the width fraction so the reserve is always a true pixel square. */
export function qrSquareRect(
  qr: Pick<ProductionQrLayout, "x" | "y" | "size">,
  canvas: FinishedCanvasSpec = FINISHED_CANVAS,
): ProductionRect {
  return {
    x: qr.x,
    y: qr.y,
    width: qr.size,
    height: (qr.size * canvas.widthPx) / canvas.heightPx,
  };
}

/** Tolerates legacy persisted QR rects (independent width/height) — collapses them to the
 *  inscribed square, matching how the compositor always rendered the QR. */
function normalizeQrSize(raw: unknown, fallback: number): number {
  const parsed = (raw ?? {}) as { size?: unknown; width?: unknown; height?: unknown };
  if (isFiniteNumber(parsed.size)) return clampNumber(parsed.size, 0.05, 0.95);
  const { widthPx, heightPx } = FINISHED_CANVAS;
  const wPx = isFiniteNumber(parsed.width) ? clamp01(parsed.width) * widthPx : Number.POSITIVE_INFINITY;
  const hPx = isFiniteNumber(parsed.height) ? clamp01(parsed.height) * heightPx : Number.POSITIVE_INFINITY;
  const sizePx = Math.min(wPx, hPx);
  if (Number.isFinite(sizePx)) return clampNumber(sizePx / widthPx, 0.05, 0.95);
  return fallback;
}

/** Derives the current production defaults from canonical pass-layout constants. */
export function defaultProductionLayoutFromPassLayout(): ProductionLayout {
  const { widthPx, heightPx, cropLeftPx } = FINISHED_CANVAS;
  const qrLeft = QR_ZONE.left - cropLeftPx;
  const serialLeft = SERIAL_X0 - cropLeftPx;

  return {
    version: 1,
    qr: {
      x: (qrLeft + QR_ZONE.size / 2) / widthPx,
      y: (QR_ZONE.top + QR_ZONE.size / 2) / heightPx,
      size: QR_ZONE.size / widthPx,
      padding: 0.02,
      whiteBackgroundOpacity: 1,
    },
    serial: {
      x: (serialLeft + SERIAL_WIDTH_PX / 2) / widthPx,
      y: (SERIAL_Y0 + SERIAL_HEIGHT_PX / 2) / heightPx,
      width: SERIAL_WIDTH_PX / widthPx,
      height: SERIAL_HEIGHT_PX / heightPx,
      fontSize: 30,
      rotation: 0,
      inkOpacity: 0.92,
    },
    safeArea: { enabled: true, margin: 0.04 },
  };
}

export function normalizeProductionLayout(raw: unknown): ProductionLayout {
  const fallback = defaultProductionLayoutFromPassLayout();
  if (!raw || typeof raw !== "object") return fallback;

  const parsed = raw as Partial<ProductionLayout>;
  const serialRect = normalizeRect(parsed.serial, fallback.serial);

  return {
    version: 1,
    qr: {
      x: isFiniteNumber(parsed.qr?.x) ? clamp01(parsed.qr.x) : fallback.qr.x,
      y: isFiniteNumber(parsed.qr?.y) ? clamp01(parsed.qr.y) : fallback.qr.y,
      size: normalizeQrSize(parsed.qr, fallback.qr.size),
      padding: isFiniteNumber(parsed.qr?.padding) ? clamp01(parsed.qr.padding) : fallback.qr.padding,
      whiteBackgroundOpacity: isFiniteNumber(parsed.qr?.whiteBackgroundOpacity)
        ? clamp01(parsed.qr.whiteBackgroundOpacity)
        : fallback.qr.whiteBackgroundOpacity,
    },
    serial: {
      ...serialRect,
      fontSize: isFiniteNumber(parsed.serial?.fontSize)
        ? clampNumber(parsed.serial.fontSize, 10, 72)
        : fallback.serial.fontSize,
      rotation: isFiniteNumber(parsed.serial?.rotation)
        ? clampNumber(parsed.serial.rotation, -45, 45)
        : fallback.serial.rotation,
      inkOpacity: isFiniteNumber(parsed.serial?.inkOpacity)
        ? clamp01(parsed.serial.inkOpacity)
        : fallback.serial.inkOpacity,
    },
    safeArea: {
      enabled: typeof parsed.safeArea?.enabled === "boolean" ? parsed.safeArea.enabled : fallback.safeArea.enabled,
      margin: isFiniteNumber(parsed.safeArea?.margin) ? clamp01(parsed.safeArea.margin) : fallback.safeArea.margin,
    },
  };
}

export function productionLayoutToReserves(layout: ProductionLayout): ProductionLayoutReserves {
  const { widthPx, heightPx } = FINISHED_CANVAS;

  const qrZone = layout.qr.size * widthPx;
  const qrPaddingPx = layout.qr.padding * qrZone;
  const qrSize = Math.round(Math.max(48, qrZone - qrPaddingPx * 2));
  const qrCenterX = layout.qr.x * widthPx;
  const qrCenterY = layout.qr.y * heightPx;

  const serialW = Math.round(layout.serial.width * widthPx);
  const serialH = Math.round(layout.serial.height * heightPx);
  const serialCenterX = layout.serial.x * widthPx;
  const serialCenterY = layout.serial.y * heightPx;

  const qr: PassQrPlacement = {
    left: Math.round(clampNumber(qrCenterX - qrSize / 2, 0, widthPx - qrSize)),
    top: Math.round(clampNumber(qrCenterY - qrSize / 2, 0, heightPx - qrSize)),
    size: qrSize,
  };

  const serial = {
    left: Math.round(clampNumber(serialCenterX - serialW / 2, 0, widthPx - serialW)),
    top: Math.round(clampNumber(serialCenterY - serialH / 2, 0, heightPx - serialH)),
    width: serialW,
    height: serialH,
  };

  return {
    qr,
    serial,
    serialStyle: {
      fontSize: layout.serial.fontSize,
      rotation: layout.serial.rotation,
      inkOpacity: layout.serial.inkOpacity,
    },
    qrWhiteBackgroundOpacity: layout.qr.whiteBackgroundOpacity,
  };
}

/** Maps finished-canvas layout to percentage overlay on the raw AI back artwork. */
export function productionRectToRawPercent(
  rect: ProductionRect,
  canvas: FinishedCanvasSpec = FINISHED_CANVAS,
): { leftPct: number; topPct: number; widthPct: number; heightPct: number } {
  const zoneW = rect.width * canvas.widthPx;
  const zoneH = rect.height * canvas.heightPx;
  const centerX = rect.x * canvas.widthPx + canvas.cropLeftPx;
  const centerY = rect.y * canvas.heightPx;
  const left = centerX - zoneW / 2;
  const top = centerY - zoneH / 2;

  return {
    leftPct: (left / canvas.rawWidthPx) * 100,
    topPct: (top / canvas.rawHeightPx) * 100,
    widthPct: (zoneW / canvas.rawWidthPx) * 100,
    heightPct: (zoneH / canvas.rawHeightPx) * 100,
  };
}

export function safeAreaInsetPercent(
  safeArea: ProductionSafeArea,
  canvas: FinishedCanvasSpec = FINISHED_CANVAS,
): number {
  if (!safeArea.enabled) return 0;
  const marginPx = safeArea.margin * Math.min(canvas.widthPx, canvas.heightPx);
  return (marginPx / canvas.rawWidthPx) * 100;
}

export function clampProductionLayout(layout: ProductionLayout): ProductionLayout {
  const normalized = normalizeProductionLayout(layout);
  if (!normalized.safeArea.enabled) return normalized;

  const margin = normalized.safeArea.margin;
  const inset = margin / 2;

  function clampRect(rect: ProductionRect): ProductionRect {
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    return {
      ...rect,
      x: clampNumber(rect.x, margin + halfW, 1 - margin - halfW),
      y: clampNumber(rect.y, margin + halfH, 1 - margin - halfH),
      width: clampNumber(rect.width, 0.05, 1 - inset * 2),
      height: clampNumber(rect.height, 0.03, 1 - inset * 2),
    };
  }

  const size = clampNumber(normalized.qr.size, 0.05, 1 - inset * 2);
  const qrHalf = qrSquareRect({ ...normalized.qr, size });
  const clampedQr = {
    ...normalized.qr,
    size,
    x: clampNumber(normalized.qr.x, margin + qrHalf.width / 2, 1 - margin - qrHalf.width / 2),
    y: clampNumber(normalized.qr.y, margin + qrHalf.height / 2, 1 - margin - qrHalf.height / 2),
  };

  return {
    ...normalized,
    qr: clampedQr,
    serial: { ...normalized.serial, ...clampRect(normalized.serial) },
  };
}

export function defaultProductionLayoutPresetId(): string {
  return PRODUCTION_LAYOUT_PRESETS[0]?.id ?? "festival-pass";
}
