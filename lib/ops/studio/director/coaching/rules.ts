import type { DirectorExhibitCoachingRecord, CoachingRuleHints } from "./types";

const REASON_CATEGORY_PENALTIES: Record<string, string[]> = {
  "Wrong iconic frame": ["close-up", "crowd"],
  "Wrong opening image": ["crowd", "alternate"],
  "Performance frame isn't memorable": ["wide", "crowd"],
  "Feels repetitive": ["performance", "hero"],
  "Poor visual variety": ["performance"],
  "Weak ending": ["crowd"],
};

const REASON_CATEGORY_PREFERENCES: Record<string, string[]> = {
  "Wrong iconic frame": ["close-up", "performance", "alternate"],
  "Performance frame isn't memorable": ["performance", "close-up"],
  "Weak ending": ["performance", "close-up", "alternate"],
  "Poor visual variety": ["alternate", "close-up", "crowd", "wide"],
};

function normalizeCategory(category: string | null): string {
  if (!category) return "unknown";
  return category.toLowerCase().replace(/\s+/g, "-");
}

/** Aggregate coaching records into simple rule hints for future frame selection. */
export function buildCoachingRuleHints(records: DirectorExhibitCoachingRecord[]): CoachingRuleHints {
  const categoryScores = new Map<string, number>();
  const reasonCounts = new Map<string, number>();

  for (const record of records) {
    for (const reason of record.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }

    const cat = normalizeCategory(record.frameCategory);
    if (cat === "unknown") continue;

    if (record.verdict === "perfect") {
      categoryScores.set(cat, (categoryScores.get(cat) ?? 0) + 2);
    } else if (record.verdict === "good") {
      categoryScores.set(cat, (categoryScores.get(cat) ?? 0) + 1);
    } else if (record.verdict === "wrong") {
      categoryScores.set(cat, (categoryScores.get(cat) ?? 0) - 2);
      for (const coachingReason of record.reasons) {
        for (const penalty of REASON_CATEGORY_PENALTIES[coachingReason] ?? []) {
          categoryScores.set(penalty, (categoryScores.get(penalty) ?? 0) - 1);
        }
        for (const pref of REASON_CATEGORY_PREFERENCES[coachingReason] ?? []) {
          categoryScores.set(pref, (categoryScores.get(pref) ?? 0) + 1);
        }
      }
    }
  }

  const ranked = [...categoryScores.entries()].sort((a, b) => b[1] - a[1]);
  const preferredCategories = ranked.filter(([, s]) => s > 0).map(([c]) => c);
  const avoidCategories = ranked.filter(([, s]) => s < 0).map(([c]) => c);

  return {
    preferredCategories,
    avoidCategories,
    reasonCounts: Object.fromEntries(reasonCounts.entries()),
  };
}

export function sortBucketsWithHints(buckets: string[], hints?: CoachingRuleHints | null): string[] {
  if (!hints) return buckets;
  return [...buckets].sort((a, b) => {
    const aNorm = normalizeCategory(a);
    const bNorm = normalizeCategory(b);
    const aScore =
      (hints.preferredCategories.includes(aNorm) ? 10 : 0) -
      (hints.avoidCategories.includes(aNorm) ? 10 : 0);
    const bScore =
      (hints.preferredCategories.includes(bNorm) ? 10 : 0) -
      (hints.avoidCategories.includes(bNorm) ? 10 : 0);
    return bScore - aScore;
  });
}
