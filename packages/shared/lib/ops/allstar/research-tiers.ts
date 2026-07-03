export type ResearchTier = {
  id: string;
  label: string;
  threshold: number;
  unlocked: boolean;
  description: string;
};

export type ResearchTierState = {
  preservedCount: number;
  tiers: ResearchTier[];
  activeTier: ResearchTier;
  rankingsEnabled: boolean;
  correlationsEnabled: boolean;
  eraComparisonsEnabled: boolean;
  accuracyStudiesEnabled: boolean;
  fullFormulaEnabled: boolean;
};

const TIER_DEFS: Array<Omit<ResearchTier, "unlocked">> = [
  {
    id: "rankings",
    label: "Basic Rankings",
    threshold: 10,
    description: "Top accurate and least accurate card rankings.",
  },
  {
    id: "correlations",
    label: "Correlation Calculations",
    threshold: 25,
    description: "HR, BB, K, and overall Pearson correlations.",
  },
  {
    id: "era-comparisons",
    label: "Era Comparisons",
    threshold: 50,
    description: "Average disc probabilities grouped by baseball era.",
  },
  {
    id: "accuracy-studies",
    label: "Accuracy Studies",
    threshold: 100,
    description: "Deep accuracy distribution and surprise scoring.",
  },
  {
    id: "full-formula",
    label: "Full Cadaco Formula Research",
    threshold: 166,
    description: "Complete collection formula reverse-engineering.",
  },
];

export function buildResearchTierState(
  preservedCount: number,
  totalTarget = 166,
): ResearchTierState {
  const tiers = TIER_DEFS.map((tier) => ({
    ...tier,
    threshold: tier.id === "full-formula" ? totalTarget : tier.threshold,
    unlocked: preservedCount >= (tier.id === "full-formula" ? totalTarget : tier.threshold),
  }));

  const activeTier = [...tiers].reverse().find((t) => t.unlocked) ?? tiers[0];

  return {
    preservedCount,
    tiers,
    activeTier,
    rankingsEnabled: preservedCount >= 10,
    correlationsEnabled: preservedCount >= 25,
    eraComparisonsEnabled: preservedCount >= 50,
    accuracyStudiesEnabled: preservedCount >= 100,
    fullFormulaEnabled: preservedCount >= totalTarget,
  };
}
