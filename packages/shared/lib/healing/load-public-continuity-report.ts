import "server-only";

import type {
  HealedPublicVerification,
  PublicContinuityReport,
} from "@/lib/healing/continuity-types";
import {
  loadPublicExhibitSnapshot,
  loadTrackChartMeta,
  publicSnapshotFromApplyBefore,
} from "@/lib/healing/public-exhibit-snapshot";
import { readHealingAuditLog } from "@/lib/healing/read-audit-log";
import {
  buildContinuitySignals,
  continuityTrustAnswer,
  impactNote,
  publicContinuityVerdict,
  publicImpactScore,
  toHighImpactObservation,
} from "@/lib/healing/verify-public-continuity";
import { loadHealingApplyPreviousState } from "@/lib/healing/validate-healing-apply";
import { inspectQuery } from "@/lib/inspect/pg";

type ProposalRow = {
  id: number;
  rvtr: string;
  album_id: number;
  status: string;
  proposed_at: string;
};

async function loadHealedProposals(): Promise<ProposalRow[]> {
  try {
    return await inspectQuery(
      `
      SELECT id, rvtr, album_id, status, proposed_at::text AS proposed_at
      FROM track_album_link_proposals
      WHERE status IN ('applied', 'rolled_back')
      ORDER BY proposed_at DESC
      LIMIT 50
      `,
    );
  } catch {
    return [];
  }
}

/** Public continuity verification — connects heals to `/track` exhibit surface. */
export async function loadPublicContinuityReport(): Promise<PublicContinuityReport> {
  const [proposals, audit] = await Promise.all([loadHealedProposals(), readHealingAuditLog()]);

  const applyByProposal = new Map(
    audit
      .filter((e) => e.action === "apply" && e.ok && e.proposalId && e.previousState)
      .map((e) => [e.proposalId!, e]),
  );

  const verifications: HealedPublicVerification[] = [];

  for (const p of proposals) {
    const rvtr = p.rvtr.trim().toUpperCase();
    const apply = applyByProposal.get(p.id);
    const graphBefore =
      apply?.previousState ?? (await loadHealingApplyPreviousState(rvtr));
    if (!graphBefore) continue;

    const meta = await loadTrackChartMeta(rvtr);
    const before = publicSnapshotFromApplyBefore(graphBefore, meta);
    const after = await loadPublicExhibitSnapshot(rvtr);

    const lifecycle =
      p.status === "applied"
        ? "active"
        : p.status === "rolled_back"
          ? "rolled_back"
          : "uncertain";

    const signals = buildContinuitySignals(before, after);
    const verdict = publicContinuityVerdict(lifecycle, signals, before, after);
    const score = publicImpactScore(before, after, signals, lifecycle);

    verifications.push({
      rvtr,
      proposalId: p.id,
      lifecycle,
      before,
      after,
      signals,
      verdict,
      trustAnswer: continuityTrustAnswer(verdict, before, after),
      publicImpactScore: score,
      impactNote: impactNote(before, after, score),
    });
  }

  const moreComplete = verifications.filter((v) => v.verdict === "more_complete").length;
  const partialGain = verifications.filter((v) => v.verdict === "partial").length;
  const unchanged = verifications.filter((v) => v.verdict === "unchanged").length;
  const withCoverGain = verifications.filter((v) =>
    v.signals.some((s) => s.kind === "cover_continuity" && s.improved),
  ).length;
  const withAlbumShelfGain = verifications.filter((v) =>
    v.signals.some((s) => s.kind === "album_shelf" && s.improved),
  ).length;

  const highImpact = verifications
    .map(toHighImpactObservation)
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const examples = verifications
    .filter((v) => v.verdict === "more_complete" || v.verdict === "partial")
    .sort((a, b) => b.publicImpactScore - a.publicImpactScore)
    .slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      verified: verifications.length,
      moreComplete,
      partialGain,
      unchanged,
      withCoverGain,
      withAlbumShelfGain,
    },
    verifications,
    highImpact,
    examples,
  };
}

export type { PublicContinuityReport };
