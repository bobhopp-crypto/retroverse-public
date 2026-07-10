import "server-only";

import type { ImportInput, ImportSource, RawImportImage } from "../types";

/** Future importer source — one page per slide. Not implemented; registered
 * now so the source registry (and any future UI) already has a slot for it
 * without changing the pipeline or runtime later. */
export const pdfSource: ImportSource = {
  kind: "pdf",
  async listImages(_input: ImportInput): Promise<RawImportImage[]> {
    throw new Error("PDF import is not yet supported.");
  },
};
