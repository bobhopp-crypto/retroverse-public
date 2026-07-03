import type { PublicContinuityReport } from "@/lib/healing/continuity-types";
import type { HealingDegradedQueue } from "@/lib/healing/load-degraded-queue";
import { classifyRestorationFamily, FAMILY_META } from "@/lib/healing/restoration-families";
import type {
  HealingRestorationPatterns,
  RestorationFamilyId,
} from "@/lib/healing/pattern-types";
import type {
  ConsolidatedRestorationFamily,
  FamilyConsolidationReport,
  FamilyImpactTier,
  FamilySafetyTier,
} from "@/lib/healing/consolidation-types";
import type { HealingValidationReport } from "@/lib/healing/validation-types";

const FAMILY_PROFILE: Record<
  RestorationFamilyId,
  {
    safetyTier: FamilySafetyTier;
    rollbackRisk: "low" | "medium" | "high";
    publicImpactTier: FamilyImpactTier;
    riskWhy: string | null;
    falseConfidenceNote: string | null;
  }
> = {
  high_confidence_studio_match: {
    safetyTier: "safe",
    rollbackRisk: "low",
    publicImpactTier: "high",
    riskWhy: null,
    falseConfidenceNote: null,
  },
  cover_critical_chart_gap: {
    safetyTier: "cautious",
    rollbackRisk: "medium",
    publicImpactTier: "high",
    riskWhy: "Wrong album restores cover but poisons chart era.",
    falseConfidenceNote: "Compilation tops can score high on title match.",
  },
  early_era_orphan_single: {
    safetyTier: "cautious",
    rollbackRisk: "medium",
    publicImpactTier: "medium",
    riskWhy: "Pre-album-chart singles lack obvious LP home.",
    falseConfidenceNote: "Greatest Hits slots absorb Motown-era orphans.",
  },
  vdj_only_overlay: {
    safetyTier: "cautious",
    rollbackRisk: "low",
    publicImpactTier: "high",
    riskWhy: null,
    falseConfidenceNote: "Media exists — matcher may overweight library metadata.",
  },
  duplicate_ingest_family: {
    safetyTier: "high_risk",
    rollbackRisk: "high",
    publicImpactTier: "medium",
    riskWhy: "Healing a variant splits canonical chart identity.",
    falseConfidenceNote: "Confidence reflects fragmented RVTR, not root entity.",
  },
  compilation_poisoned: {
    safetyTier: "high_risk",
    rollbackRisk: "high",
    publicImpactTier: "low",
    riskWhy: "Cover gain with wrong era — public feels complete but untrustworthy.",
    falseConfidenceNote: "Greatest Hits / Best Of title slots inflate match score.",
  },
  anthology_weak_join: {
    safetyTier: "high_risk",
    rollbackRisk: "high",
    publicImpactTier: "low",
    riskWhy: "Anthology tracklist weak joins pollute album graph.",
    falseConfidenceNote: "Weak year delta hidden behind title match.",
  },
  soundtrack_candidate_trap: {
    safetyTier: "high_risk",
    rollbackRisk: "high",
    publicImpactTier: "low",
    riskWhy: "OST link mismatches artist-led chart narrative.",
    falseConfidenceNote: "Soundtrack albums share titles across artists.",
  },
  ambiguous_multi_candidate: {
    safetyTier: "high_risk",
    rollbackRisk: "medium",
    publicImpactTier: "medium",
    riskWhy: "Near-tied scores — first row is not always studio LP.",
    falseConfidenceNote: "Top two candidates within ~0.08 confidence.",
  },
  general_degraded: {
    safetyTier: "cautious",
    rollbackRisk: "medium",
    publicImpactTier: "medium",
    riskWhy: "Unclassified — requires manual family assignment.",
    falseConfidenceNote: null,
  },
};

const SAFE_PATTERN_LINES = [
  "Same canonical artist + release year delta 0–2 + tracklist title match",
  "Sibling album bridge (canonical_track_album_link_bridge)",
  "High-confidence studio match family — verify slot, then single approve",
  "Cover-critical chart gap — studio LP with cover before any compilation",
];

export function buildFamilyConsolidationReport(
  queue: HealingDegradedQueue,
  patterns: HealingRestorationPatterns,
  validation: HealingValidationReport,
  continuity: PublicContinuityReport,
): FamilyConsolidationReport {
  const sampleByFamily = new Map<RestorationFamilyId, number>();
  for (const row of queue.rows) {
    const id = classifyRestorationFamily(row);
    sampleByFamily.set(id, (sampleByFamily.get(id) ?? 0) + 1);
  }

  const healsByFamily = new Map<
    RestorationFamilyId,
    { retained: number; rolledBack: number; impactSum: number; impactN: number }
  >();

  for (const entity of validation.healedEntities) {
    const id = entity.restorationFamily ?? "general_degraded";
    const cur = healsByFamily.get(id) ?? { retained: 0, rolledBack: 0, impactSum: 0, impactN: 0 };
    if (entity.lifecycle === "active") cur.retained += 1;
    if (entity.lifecycle === "rolled_back") cur.rolledBack += 1;
    healsByFamily.set(id, cur);
  }

  for (const v of continuity.verifications) {
    const entity = validation.healedEntities.find((e) => e.proposalId === v.proposalId);
    const id = entity?.restorationFamily ?? "general_degraded";
    const cur = healsByFamily.get(id) ?? { retained: 0, rolledBack: 0, impactSum: 0, impactN: 0 };
    cur.impactSum += v.publicImpactScore;
    cur.impactN += 1;
    healsByFamily.set(id, cur);
  }

  const familyFindings = patterns.families;
  const allIds = [...new Set<RestorationFamilyId>([
    ...familyFindings.map((f) => f.id),
    ...sampleByFamily.keys(),
  ])];

  const consolidated: ConsolidatedRestorationFamily[] = allIds.map((id) => {
    const finding = familyFindings.find((f) => f.id === id);
    const profile = FAMILY_PROFILE[id];
    const meta = FAMILY_META[id];
    const heals = healsByFamily.get(id);
    const approximateCount =
      finding?.approximateCount ??
      sampleByFamily.get(id) ??
      0;
    const countSource = finding?.countSource ?? "queue_sample";

    return {
      id,
      name: meta.name,
      approximateCount,
      countSource,
      sampleInQueue: sampleByFamily.get(id) ?? 0,
      safetyTier: profile.safetyTier,
      rollbackRisk: profile.rollbackRisk,
      publicImpactTier: profile.publicImpactTier,
      safestApproach: meta.strategy,
      curatorGuidance: meta.guidance,
      riskWhy: profile.riskWhy,
      falseConfidenceNote: profile.falseConfidenceNote,
      examples: finding?.examples ?? [],
      healsRetained: heals?.retained ?? 0,
      healsRolledBack: heals?.rolledBack ?? 0,
      avgPublicImpactScore:
        heals && heals.impactN > 0
          ? Math.round((heals.impactSum / heals.impactN) * 10) / 10
          : 0,
      recurrenceRank: 0,
    };
  });

  consolidated.sort((a, b) => b.approximateCount - a.approximateCount);
  consolidated.forEach((f, i) => {
    f.recurrenceRank = i + 1;
  });

  const safestFamilies = consolidated.filter((f) => f.safetyTier === "safe");
  const highestRiskFamilies = consolidated
    .filter((f) => f.safetyTier === "high_risk")
    .sort((a, b) => b.approximateCount - a.approximateCount);

  const biggestPublicImpact = continuity.highImpact.map((h) => {
    const entity = validation.healedEntities.find((e) => e.rvtr === h.rvtr);
    return {
      rvtr: h.rvtr,
      title: h.title,
      familyName: entity?.restorationFamilyName ?? "—",
      score: h.score,
      note: h.note,
      trackHref: h.trackHref,
    };
  });

  const topRecurring = consolidated[0];
  const summary = topRecurring
    ? `Largest recurring family: ${topRecurring.name} (~${topRecurring.approximateCount.toLocaleString()} ${topRecurring.countSource}). ${consolidated.filter((f) => f.safetyTier === "safe").length} safe · ${highestRiskFamilies.length} high-risk families — curator-led only.`
    : "Classify queue rows to build family recurrence.";

  return {
    generatedAt: new Date().toISOString(),
    summary,
    consolidatedFamilies: consolidated,
    safestFamilies,
    highestRiskFamilies,
    biggestPublicImpact,
    safeRestorationPatterns: [
      ...SAFE_PATTERN_LINES,
      ...patterns.safeFixPatterns
        .filter((p) => p.reliability === "high")
        .map((p) => p.pattern),
    ],
    governanceNote:
      "No autonomous healing, bulk apply, or mass graph mutation. Families guide curator judgment only.",
  };
}
