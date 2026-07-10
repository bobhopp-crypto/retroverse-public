import "server-only";

import { readdir, readFile } from "fs/promises";
import { join } from "path";

import type { ImportInput, ImportSource, RawImportImage } from "../types";

const IMAGE_EXT = /\.(png|jpe?g)$/i;

/** A plain folder of PNG/JPG files, non-recursive. */
export const folderSource: ImportSource = {
  kind: "folder",
  async listImages(input: ImportInput): Promise<RawImportImage[]> {
    if (!input.path) throw new Error("folder source requires a path.");
    const entries = await readdir(input.path, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && IMAGE_EXT.test(entry.name));

    const images: RawImportImage[] = [];
    for (const file of files) {
      const buffer = await readFile(join(input.path, file.name));
      images.push({ filename: file.name, buffer });
    }
    return images;
  },
};
