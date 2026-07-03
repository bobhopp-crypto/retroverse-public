import type { CuratedRecommendation } from "../../types";

const YEAR = 1967;

export function curated(
  category: string,
  slug: string,
  title: string,
  description: string,
  sourceCategory: string,
  priority: CuratedRecommendation["priority"],
): CuratedRecommendation {
  return {
    id: `rec-${YEAR}-${category}-${slug}`,
    title,
    description,
    year: YEAR,
    sourceCategory,
    priority,
  };
}
