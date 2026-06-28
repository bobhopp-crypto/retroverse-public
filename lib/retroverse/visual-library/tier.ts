import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import type { EditorStoryPackage } from "@/lib/ops/studio/editor/types";

import type { VisualLibraryTier } from "./types";

export function resolveVisualLibraryTier(input: {
  collector: CollectorPackage | null;
  editor: EditorStoryPackage | null;
  persistedTier?: VisualLibraryTier | null;
}): VisualLibraryTier {
  if (input.persistedTier) return input.persistedTier;

  const meta = input.editor?.meta;
  if (meta?.editorialStatus === "showcase_curation") return "showcase";

  const patronValue = input.editor?.workspace.editorialReview?.patronValue;
  if (typeof patronValue === "number" && patronValue >= 8.5) {
    const hasVideo =
      (input.collector?.performances ?? []).some(
        (p) => p.visualAssets.extraction.extractedCount > 0,
      ) ?? false;
    if (hasVideo) return "curated";
  }

  const extracted =
    input.collector?.visualAssets?.extraction?.extractedCount ??
    input.collector?.performances?.find((p) => p.visualAssets.extraction.extractedCount > 0)
      ?.visualAssets.extraction.extractedCount ??
    0;

  if (extracted > 0) return "video";

  return "ordinary";
}
