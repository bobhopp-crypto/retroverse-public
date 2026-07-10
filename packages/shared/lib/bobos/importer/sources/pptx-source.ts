import "server-only";

import type { ImportInput, ImportSource, RawImportImage } from "../types";

/** Future importer source — one slide per image export. Not implemented;
 * registered now so adding it later never touches the pipeline or runtime. */
export const pptxSource: ImportSource = {
  kind: "pptx",
  async listImages(_input: ImportInput): Promise<RawImportImage[]> {
    throw new Error("PowerPoint import is not yet supported.");
  },
};
