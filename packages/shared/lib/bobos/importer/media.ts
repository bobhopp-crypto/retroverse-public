import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";

export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

export type ProbedImage = {
  width: number | null;
  height: number | null;
  thumbnail: Buffer;
};

const THUMBNAIL_WIDTH = 480;

/** Dimensions of the master image + a resized JPEG thumbnail for browser cards.
 * Only downscales (never upscales) — this repo's local sharp typings
 * (types/sharp.d.ts) require explicit width+height, so the target height is
 * computed from the probed aspect ratio rather than relying on auto-scale. */
export async function probeAndThumbnail(buffer: Buffer): Promise<ProbedImage> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  const thumbnail =
    width && height && width > THUMBNAIL_WIDTH
      ? await sharp(buffer)
          .resize(THUMBNAIL_WIDTH, Math.round(THUMBNAIL_WIDTH * (height / width)), { fit: "inside" })
          .jpeg({ quality: 82 })
          .toBuffer()
      : await sharp(buffer).jpeg({ quality: 82 }).toBuffer();

  return { width, height, thumbnail };
}
