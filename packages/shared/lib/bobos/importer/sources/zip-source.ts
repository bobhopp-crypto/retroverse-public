import "server-only";

import AdmZip from "adm-zip";

import type { ImportInput, ImportSource, RawImportImage } from "../types";

const IMAGE_EXT = /\.(png|jpe?g)$/i;

/** ZIP of PNG/JPG files (e.g. a Gamma export). Flat or nested — only the
 * basename and extension matter; directory structure inside the zip is ignored. */
export const zipSource: ImportSource = {
  kind: "zip",
  async listImages(input: ImportInput): Promise<RawImportImage[]> {
    if (!input.path && !input.buffer) {
      throw new Error("zip source requires a path or buffer.");
    }
    const zip = input.path ? new AdmZip(input.path) : new AdmZip(input.buffer);

    const images: RawImportImage[] = [];
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      if (!IMAGE_EXT.test(entry.entryName)) continue;
      const filename = entry.entryName.split("/").pop() ?? entry.entryName;
      images.push({ filename, buffer: entry.getData() });
    }
    return images;
  },
};
