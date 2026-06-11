import { mkdir } from "fs/promises";
import sharp from "sharp";

import { contentCreatorThumbnailPath, contentCreatorThumbnailsDir } from "./paths";

const THUMB_WIDTH = 256;

export async function writeGenerationThumbnail(generationId: string, frontPng: Buffer): Promise<string> {
  await mkdir(contentCreatorThumbnailsDir(), { recursive: true });
  const out = contentCreatorThumbnailPath(generationId);
  await sharp(frontPng)
    .resize(THUMB_WIDTH, Math.round(THUMB_WIDTH * (1536 / 1024)), { fit: "inside" })
    .jpeg({ quality: 82 })
    .toFile(out);
  return out;
}
