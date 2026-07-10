import "server-only";

import type { ImportSource, ImportSourceKind } from "../types";
import { folderSource } from "./folder-source";
import { pdfSource } from "./pdf-source";
import { pptxSource } from "./pptx-source";
import { zipSource } from "./zip-source";

const REGISTRY: Record<ImportSourceKind, ImportSource> = {
  zip: zipSource,
  folder: folderSource,
  pdf: pdfSource,
  pptx: pptxSource,
};

export function getImportSource(kind: ImportSourceKind): ImportSource {
  return REGISTRY[kind];
}
