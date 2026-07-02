import "server-only";

import sharp from "sharp";

import {
  effectiveAdjustmentFactors,
  isIdentityAdjustment,
  type PassArtworkAdjustments,
} from "./pass-artwork-adjustments";

/**
 * Non-destructive brightness/contrast/saturation pass over a raw PNG buffer. The source
 * buffer is never mutated — this always returns a new buffer, and can be called repeatedly
 * against the same raw AI generation with different settings (no AI regeneration required).
 */
export async function applyPassArtworkAdjustments(
  png: Buffer,
  adjustments: PassArtworkAdjustments,
): Promise<Buffer> {
  if (isIdentityAdjustment(adjustments)) return png;

  const { brightness, contrast, saturation } = effectiveAdjustmentFactors(adjustments);
  let pipeline = sharp(png).modulate({ brightness, saturation });
  if (contrast !== 1) {
    // Standard contrast-around-midpoint linear transform: out = (in - 128) * contrast + 128
    pipeline = pipeline.linear(contrast, 128 * (1 - contrast));
  }
  return pipeline.png().toBuffer();
}
