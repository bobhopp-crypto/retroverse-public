import { parseRvTagString, type RvTagId } from "@/lib/ops/rvtags-review/vocabulary";

/** Where displayed Retroverse Tags came from (RVTR store is source of truth). */
export type RetroverseTagsSource =
  | "canonical"
  | "legacy_review"
  | "vdj_import"
  | "none";

export type ResolvedRetroverseTags = {
  tags: RvTagId[];
  source: RetroverseTagsSource;
  /** True when tags are shown from VDJ User2 and not yet saved on the RVTR. */
  pendingCanonicalSave: boolean;
};

/**
 * Resolve tags for display/enrichment.
 *
 * Priority: RVTR canonical store → legacy year-review record → VDJ User2 import hint.
 * VDJ never owns tags; import hints are not persisted until written to the RVTR store.
 */
export function resolveRetroverseTags(input: {
  canonicalTags: RvTagId[];
  legacyReviewTags: RvTagId[];
  vdjUser2Raw: string;
}): ResolvedRetroverseTags {
  if (input.canonicalTags.length > 0) {
    return {
      tags: input.canonicalTags,
      source: "canonical",
      pendingCanonicalSave: false,
    };
  }

  if (input.legacyReviewTags.length > 0) {
    return {
      tags: input.legacyReviewTags,
      source: "legacy_review",
      pendingCanonicalSave: false,
    };
  }

  const imported = parseRvTagString(input.vdjUser2Raw);
  if (imported.length > 0) {
    return {
      tags: imported,
      source: "vdj_import",
      pendingCanonicalSave: true,
    };
  }

  return { tags: [], source: "none", pendingCanonicalSave: false };
}
