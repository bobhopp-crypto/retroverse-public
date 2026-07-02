/**
 * BobOS Pass Workspace — Print Boost adjustments.
 *
 * Non-destructive brightness/contrast/saturation controls for AI pass artwork. The raw
 * generation PNG in the Content Creator library is never touched — adjustments are always
 * derived at read/finish time and can be changed freely without re-running AI generation.
 *
 * Pure types + math only in this file (safe to import from client components). The actual
 * pixel processing (sharp) lives in `pass-artwork-adjustments.server.ts`.
 */

export type PassArtworkAdjustments = {
  /** 0.7–1.3, 1 = unchanged. */
  brightness: number;
  /** 0.7–1.3, 1 = unchanged. */
  contrast: number;
  /** 0.7–1.3, 1 = unchanged. */
  saturation: number;
  /** Fixed correction on top of the sliders — tuned for the AI provider's characteristically
   *  dark, flat output so passes read well in print. On by default; always removable. */
  printBoost: boolean;
};

export const PASS_ADJUSTMENT_MIN = 0.7;
export const PASS_ADJUSTMENT_MAX = 1.3;
export const PASS_ADJUSTMENT_STEP = 0.02;

export const DEFAULT_PASS_ARTWORK_ADJUSTMENTS: PassArtworkAdjustments = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  printBoost: true,
};

/** Applied only when `printBoost` is on, multiplied with the slider values below. */
export const PRINT_BOOST_BRIGHTNESS = 1.14;
export const PRINT_BOOST_CONTRAST = 1.1;
export const PRINT_BOOST_SATURATION = 1.08;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizePassArtworkAdjustments(
  raw: Partial<PassArtworkAdjustments> | undefined | null,
): PassArtworkAdjustments {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PASS_ARTWORK_ADJUSTMENTS };
  return {
    brightness: clamp(Number(raw.brightness ?? 1), PASS_ADJUSTMENT_MIN, PASS_ADJUSTMENT_MAX),
    contrast: clamp(Number(raw.contrast ?? 1), PASS_ADJUSTMENT_MIN, PASS_ADJUSTMENT_MAX),
    saturation: clamp(Number(raw.saturation ?? 1), PASS_ADJUSTMENT_MIN, PASS_ADJUSTMENT_MAX),
    printBoost: raw.printBoost !== false,
  };
}

export function isIdentityAdjustment(adjustments: PassArtworkAdjustments): boolean {
  return (
    !adjustments.printBoost &&
    adjustments.brightness === 1 &&
    adjustments.contrast === 1 &&
    adjustments.saturation === 1
  );
}

/** Slider values combined with the fixed Print Boost correction, if enabled. Shared by the
 *  server-side sharp pipeline and the client-side live CSS preview so they stay in sync. */
export function effectiveAdjustmentFactors(adjustments: PassArtworkAdjustments): {
  brightness: number;
  contrast: number;
  saturation: number;
} {
  const boost = adjustments.printBoost;
  return {
    brightness: adjustments.brightness * (boost ? PRINT_BOOST_BRIGHTNESS : 1),
    contrast: adjustments.contrast * (boost ? PRINT_BOOST_CONTRAST : 1),
    saturation: adjustments.saturation * (boost ? PRINT_BOOST_SATURATION : 1),
  };
}

/** CSS `filter` value for an instant client-side preview — approximates the server-side
 *  sharp pipeline closely enough for live feedback while dragging sliders. */
export function adjustmentsToCssFilter(adjustments: PassArtworkAdjustments): string {
  const { brightness, contrast, saturation } = effectiveAdjustmentFactors(adjustments);
  if (brightness === 1 && contrast === 1 && saturation === 1) return "none";
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)})`;
}
