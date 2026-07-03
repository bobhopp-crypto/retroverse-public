/** Post-healing validation — serializable types for ops UI. */

import type { HealingApplyPreviousState } from "@/lib/healing/types";
import type { RestorationFamilyId } from "@/lib/healing/pattern-types";

export type HealedEntityLifecycle = "active" | "rolled_back" | "uncertain";

export type ExhibitQualityVerdict = "improved" | "partial" | "unchanged" | "reverted" | "unknown";

export type PublicImprovementKind =
  | "album_continuity"
  | "cover_continuity"
  | "applied_album_linked"
  | "exhibit_coherent";

export type PublicImprovementFinding = {
  kind: PublicImprovementKind;
  label: string;
  before: string;
  after: string;
  improved: boolean;
};

export type HealedEntityRecord = {
  rvtr: string;
  proposalId: number;
  albumId: number;
  albumTitle: string | null;
  healedAt: string;
  confidenceAtApply: number;
  lifecycle: HealedEntityLifecycle;
  restorationFamily: RestorationFamilyId | null;
  restorationFamilyName: string | null;
  before: HealingApplyPreviousState;
  after: HealingApplyPreviousState | null;
  improvements: PublicImprovementFinding[];
  exhibitQuality: ExhibitQualityVerdict;
  curatorVerdict: string;
};

export type ConfidenceEffectivenessBand = {
  band: "high" | "medium" | "low";
  range: string;
  applies: number;
  retained: number;
  rolledBack: number;
  retentionRate: number;
  observation: string;
};

export type RollbackCauseFinding = {
  cause: string;
  count: number;
  examples: string[];
  note: string;
};

export type HealingMemoryNote = {
  key: string;
  outcome: "stable" | "caution" | "failed" | "insufficient_data";
  applies: number;
  retained: number;
  rolledBack: number;
  note: string;
};

export type HealingValidationReport = {
  generatedAt: string;
  summary: {
    activeHealed: number;
    rolledBack: number;
    uncertain: number;
    withPublicImprovement: number;
    exhibitImproved: number;
  };
  healedEntities: HealedEntityRecord[];
  confidenceEffectiveness: ConfidenceEffectivenessBand[];
  rollbackIntelligence: RollbackCauseFinding[];
  healingMemory: HealingMemoryNote[];
  exampleHealed: HealedEntityRecord[];
};
