/** Restoration family consolidation — serializable ops types. */

import type { RestorationFamilyId } from "@/lib/healing/pattern-types";
import type { RestorationFamilyExample } from "@/lib/healing/pattern-types";

export type FamilySafetyTier = "safe" | "cautious" | "high_risk";

export type FamilyImpactTier = "high" | "medium" | "low";

export type ConsolidatedRestorationFamily = {
  id: RestorationFamilyId;
  name: string;
  approximateCount: number;
  countSource: "corpus" | "queue_sample";
  sampleInQueue: number;
  safetyTier: FamilySafetyTier;
  rollbackRisk: "low" | "medium" | "high";
  publicImpactTier: FamilyImpactTier;
  safestApproach: string;
  curatorGuidance: string;
  riskWhy: string | null;
  falseConfidenceNote: string | null;
  examples: RestorationFamilyExample[];
  healsRetained: number;
  healsRolledBack: number;
  avgPublicImpactScore: number;
  recurrenceRank: number;
};

export type FamilyConsolidationReport = {
  generatedAt: string;
  summary: string;
  consolidatedFamilies: ConsolidatedRestorationFamily[];
  safestFamilies: ConsolidatedRestorationFamily[];
  highestRiskFamilies: ConsolidatedRestorationFamily[];
  biggestPublicImpact: {
    rvtr: string;
    title: string;
    familyName: string;
    score: number;
    note: string;
    trackHref: string;
  }[];
  safeRestorationPatterns: string[];
  governanceNote: string;
};
