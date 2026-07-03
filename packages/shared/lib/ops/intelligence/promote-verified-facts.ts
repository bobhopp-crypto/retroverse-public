import type { CandidateFact } from "./song-package-types";

/** Auto-approve facts with strong anchors, locked canonical rows, or pattern hits. */
export function promoteVerifiedFacts(facts: CandidateFact[]): CandidateFact[] {
  return facts.map((f) => {
    if (f.reviewStatus === "approved" || f.reviewStatus === "rejected") return f;
    if (f.locked || f.sourceType === "canonical") {
      return { ...f, reviewStatus: "approved" };
    }
    if (f.extractionMethod === "deterministic") {
      return { ...f, reviewStatus: "approved" };
    }
    if (f.extractionMethod === "pattern_extract" && f.confidence >= 0.5) {
      return { ...f, reviewStatus: "approved" };
    }
    if (
      f.extractionMethod === "model_extract" &&
      f.confidence >= 0.62 &&
      f.excerptAnchor.trim().length >= 6
    ) {
      return { ...f, reviewStatus: "approved" };
    }
    return f;
  });
}

export function countApprovedFacts(facts: CandidateFact[]): number {
  return facts.filter((f) => f.reviewStatus === "approved" && !f.mergedIntoId).length;
}
