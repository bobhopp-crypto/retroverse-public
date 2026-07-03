import type { FactCategory, SongPackageMetadata } from "./song-package-types";

export function buildFactExtractionPrompt(input: {
  metadata: SongPackageMetadata;
  sourceLabel: string;
  excerpt: string;
  skipCategories: FactCategory[];
}): string {
  const skip =
    input.skipCategories.length > 0
      ? `\nDo NOT extract facts in these categories (already provided): ${input.skipCategories.join(", ")}.`
      : "";

  return `You are a music historian extracting verifiable facts for Retroverse.

RETROVERSE CANON FIRST:
- Retroverse graph data (RVTR, Billboard, cover, VDJ, tags) is already locked and authoritative.
- Your job is ENRICHMENT ONLY — add new facts from the excerpt that do not contradict canon.
- Never restate or override: chart peaks, play counts, RVTR identity, cover assignments, or tag assignments.
- If the excerpt disagrees with canon, skip that fact.

Song: "${input.metadata.title}" by ${input.metadata.artist} (${input.metadata.rvtr})
Canonical Hot 100 peak: ${input.metadata.peakHot100 ?? "unknown"}
Source: ${input.sourceLabel} (external enrichment)
${skip}

RULES:
- Extract ONLY facts directly supported by the EXCERPT below.
- Each fact must include excerptAnchor: an EXACT substring copied from the excerpt (minimum 20 characters).
- One claim per fact. Plain English. No metaphors. No poetry.
- Do not invent names, numbers, or events not in the excerpt.
- Do not extract Billboard chart positions (handled separately).

EXCERPT:
"""
${input.excerpt}
"""

Return valid JSON only:
{
  "facts": [
    {
      "factText": "single plain statement",
      "category": "recording|video|performance|chart|quote|artist|album|cultural_impact|tv_film|trivia",
      "excerptAnchor": "exact substring from excerpt above",
      "confidence": 0.0-1.0
    }
  ]
}

Extract 3-8 facts if supported. If nothing is verifiable, return {"facts":[]}.`;
}
