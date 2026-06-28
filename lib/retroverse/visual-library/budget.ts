import type { AssetBudget, DerivedAssetStatus, VisualLibraryTier } from "./types";

export const APPROVED_LIMITS: Record<VisualLibraryTier, number> = {
  ordinary: 0,
  video: 3,
  curated: 6,
  showcase: 12,
};

export function approvedLimitForTier(tier: VisualLibraryTier): number {
  return APPROVED_LIMITS[tier];
}

export function countDerivedByStatus(
  statuses: DerivedAssetStatus[],
  assets: { status: DerivedAssetStatus }[],
): number {
  return assets.filter((a) => statuses.includes(a.status)).length;
}

export function buildAssetBudget(
  tier: VisualLibraryTier,
  derivedAssets: { status: DerivedAssetStatus }[],
): AssetBudget {
  const approvedLimit = approvedLimitForTier(tier);
  const approvedCount = countDerivedByStatus(["approved"], derivedAssets);
  const generatedCount = countDerivedByStatus(["generated", "approved"], derivedAssets);
  const recommendedCount = countDerivedByStatus(["recommended"], derivedAssets);
  const remainingApproved = Math.max(0, approvedLimit - approvedCount);

  return {
    tier,
    approvedLimit,
    approvedCount,
    generatedCount,
    recommendedCount,
    remainingApproved,
    atLimit: approvedCount >= approvedLimit,
  };
}

export function canApproveMore(budget: AssetBudget, count = 1): boolean {
  return budget.approvedCount + count <= budget.approvedLimit;
}

export function formatBudgetUsage(budget: AssetBudget): string {
  if (budget.approvedLimit === 0) {
    return `Approved Assets · ${budget.approvedCount} (no derived budget)`;
  }
  return `Approved Assets · ${budget.approvedCount} / ${budget.approvedLimit}`;
}
