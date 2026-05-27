import "server-only";

import { compareHealingStates } from "@/lib/healing/compare-healing-state";
import {
  familyDisplayName,
  inferRestorationFamilyFromApply,
  inferRollbackCauses,
  rollbackCauseLabel,
  type RollbackCauseId,
} from "@/lib/healing/infer-healing-context";
import { readHealingAuditLog } from "@/lib/healing/read-audit-log";
import type { RestorationFamilyId } from "@/lib/healing/pattern-types";
import type { HealingAuditEntry } from "@/lib/healing/types";
import { loadHealingApplyPreviousState } from "@/lib/healing/validate-healing-apply";
import type {
  ConfidenceEffectivenessBand,
  HealedEntityRecord,
  HealingMemoryNote,
  HealingValidationReport,
  RollbackCauseFinding,
} from "@/lib/healing/validation-types";
import { inspectQuery } from "@/lib/inspect/pg";

export type { HealingValidationReport };

type ProposalRow = {
  id: number;
  rvtr: string;
  album_id: number;
  confidence: number;
  status: string;
  proposed_at: string;
  reasons: string[] | null;
};

async function loadProposals(): Promise<ProposalRow[]> {
  try {
    return await inspectQuery(
      `
      SELECT
        id,
        rvtr,
        album_id,
        confidence,
        status,
        proposed_at::text AS proposed_at,
        reasons
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

async function loadAlbumMeta(
  albumIds: number[],
): Promise<Map<number, { title: string; artistName: string }>> {
  if (!albumIds.length) return new Map();
  try {
    const rows = await inspectQuery<{ id: number; title: string; artist_name: string }>(
      `
      SELECT al.id, al.title, coalesce(ar.canonical_name, '') AS artist_name
      FROM albums al
      LEFT JOIN artists ar ON ar.id = al.artist_id
      WHERE al.id = ANY($1::int[])
      `,
      [albumIds],
    );
    return new Map(
      rows.map((r) => [r.id, { title: r.title.trim(), artistName: r.artist_name.trim() }]),
    );
  } catch {
    return new Map();
  }
}

function confidenceBand(conf: number): "high" | "medium" | "low" {
  if (conf >= 0.65) return "high";
  if (conf >= 0.45) return "medium";
  return "low";
}

function buildConfidenceEffectiveness(
  entities: HealedEntityRecord[],
): ConfidenceEffectivenessBand[] {
  const bands: Record<"high" | "medium" | "low", { applies: number; retained: number; rolledBack: number }> = {
    high: { applies: 0, retained: 0, rolledBack: 0 },
    medium: { applies: 0, retained: 0, rolledBack: 0 },
    low: { applies: 0, retained: 0, rolledBack: 0 },
  };

  for (const e of entities) {
    const b = confidenceBand(e.confidenceAtApply);
    bands[b].applies += 1;
    if (e.lifecycle === "active") bands[b].retained += 1;
    if (e.lifecycle === "rolled_back") bands[b].rolledBack += 1;
  }

  const meta: Record<"high" | "medium" | "low", { range: string; observation: string }> = {
    high: {
      range: "≥ 0.65",
      observation: "Preferred approve band when same-artist + year aligned.",
    },
    medium: {
      range: "0.45 – 0.64",
      observation: "Requires family review — elevated rollback risk on compilations.",
    },
    low: {
      range: "< 0.45",
      observation: "Below approval threshold — should not appear in retained set.",
    },
  };

  return (["high", "medium", "low"] as const).map((band) => {
    const s = bands[band];
    const rate = s.applies > 0 ? Math.round((s.retained / s.applies) * 1000) / 10 : 0;
    return {
      band,
      range: meta[band].range,
      applies: s.applies,
      retained: s.retained,
      rolledBack: s.rolledBack,
      retentionRate: rate,
      observation:
        s.applies === 0
          ? "No heals in this band yet."
          : `${meta[band].observation} Retention ${rate}% (${s.retained}/${s.applies}).`,
    };
  });
}

function buildRollbackIntelligence(
  entities: HealedEntityRecord[],
  applyByProposal: Map<number, HealingAuditEntry>,
  albumMeta: Map<number, { title: string; artistName: string }>,
): RollbackCauseFinding[] {
  const causeCounts = new Map<RollbackCauseId, { count: number; examples: string[] }>();

  for (const e of entities) {
    if (e.lifecycle !== "rolled_back") continue;
    const apply = applyByProposal.get(e.proposalId) ?? null;
    const meta = albumMeta.get(e.albumId);
    const causes = inferRollbackCauses(
      apply,
      meta?.title ?? "",
      meta?.artistName ?? "",
    );
    for (const cause of causes) {
      const cur = causeCounts.get(cause) ?? { count: 0, examples: [] };
      cur.count += 1;
      if (cur.examples.length < 3) cur.examples.push(e.rvtr);
      causeCounts.set(cause, cur);
    }
  }

  return [...causeCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([cause, data]) => {
      const { label, note } = rollbackCauseLabel(cause);
      return { cause: label, count: data.count, examples: data.examples, note };
    });
}

function buildHealingMemory(entities: HealedEntityRecord[]): HealingMemoryNote[] {
  const byFamily = new Map<
    RestorationFamilyId,
    { applies: number; retained: number; rolledBack: number }
  >();

  for (const e of entities) {
    const id = e.restorationFamily ?? "general_degraded";
    const cur = byFamily.get(id) ?? { applies: 0, retained: 0, rolledBack: 0 };
    cur.applies += 1;
    if (e.lifecycle === "active") cur.retained += 1;
    if (e.lifecycle === "rolled_back") cur.rolledBack += 1;
    byFamily.set(id, cur);
  }

  const notes: HealingMemoryNote[] = [];

  for (const [id, stats] of byFamily) {
    let outcome: HealingMemoryNote["outcome"] = "insufficient_data";
    if (stats.applies >= 1) {
      if (stats.rolledBack === 0 && stats.retained > 0) outcome = "stable";
      else if (stats.rolledBack > 0 && stats.retained === 0) outcome = "failed";
      else if (stats.rolledBack > 0) outcome = "caution";
    }
    notes.push({
      key: familyDisplayName(id),
      outcome,
      applies: stats.applies,
      retained: stats.retained,
      rolledBack: stats.rolledBack,
      note:
        outcome === "stable"
          ? "Observed retains without rollback — continue manual verify."
          : outcome === "caution"
            ? "Mixed outcomes — slow approvals in this family."
            : outcome === "failed"
              ? "Rollbacks dominate — avoid repeat pattern."
              : "Await more curator outcomes.",
    });
  }

  const highStudio = entities.filter(
    (e) =>
      e.restorationFamily === "high_confidence_studio_match" && e.lifecycle === "active",
  );
  if (highStudio.length > 0) {
    notes.push({
      key: "same_artist + tracklist + year (studio match)",
      outcome: "stable",
      applies: highStudio.length,
      retained: highStudio.length,
      rolledBack: 0,
      note: "Retained studio matches improved album or cover continuity.",
    });
  }

  return notes.sort((a, b) => b.applies - a.applies).slice(0, 10);
}

/** Post-healing validation — before/after continuity, outcomes, rollback intelligence. */
export async function loadHealingValidationReport(): Promise<HealingValidationReport> {
  const [audit, proposals] = await Promise.all([readHealingAuditLog(), loadProposals()]);

  const applySuccesses = audit.filter((e) => e.action === "apply" && e.ok && e.proposalId);
  const applyByProposal = new Map<number, HealingAuditEntry>();
  for (const e of applySuccesses) {
    if (e.proposalId) applyByProposal.set(e.proposalId, e);
  }

  const albumIds = [...new Set(proposals.map((p) => p.album_id))];
  const albumMeta = await loadAlbumMeta(albumIds);

  const healedEntities: HealedEntityRecord[] = [];

  for (const p of proposals) {
    const apply = applyByProposal.get(p.id);
    const before =
      apply?.previousState ??
      (await loadHealingApplyPreviousState(p.rvtr));
    if (!before) continue;

    const lifecycle =
      p.status === "applied"
        ? "active"
        : p.status === "rolled_back"
          ? "rolled_back"
          : "uncertain";

    const after = await loadHealingApplyPreviousState(p.rvtr);
    const meta = albumMeta.get(p.album_id);

    const family = apply
      ? inferRestorationFamilyFromApply(
          apply,
          meta?.title ?? "",
          meta?.artistName ?? "",
          before,
        )
      : null;

    const { improvements, exhibitQuality, curatorVerdict } = after
      ? compareHealingStates(before, after, p.album_id, lifecycle)
      : {
          improvements: [],
          exhibitQuality: "unknown" as const,
          curatorVerdict: "Could not load current graph state.",
        };

    healedEntities.push({
      rvtr: p.rvtr.trim().toUpperCase(),
      proposalId: p.id,
      albumId: p.album_id,
      albumTitle: meta?.title ?? null,
      healedAt: p.proposed_at,
      confidenceAtApply: p.confidence,
      lifecycle,
      restorationFamily: family,
      restorationFamilyName: family ? familyDisplayName(family) : null,
      before,
      after,
      improvements,
      exhibitQuality,
      curatorVerdict,
    });
  }

  const activeHealed = healedEntities.filter((e) => e.lifecycle === "active").length;
  const rolledBack = healedEntities.filter((e) => e.lifecycle === "rolled_back").length;
  const uncertain = healedEntities.filter((e) => e.lifecycle === "uncertain").length;
  const withPublicImprovement = healedEntities.filter((e) =>
    e.improvements.some((i) => i.improved),
  ).length;
  const exhibitImproved = healedEntities.filter((e) => e.exhibitQuality === "improved").length;

  const exampleHealed = healedEntities
    .filter((e) => e.lifecycle === "active")
    .sort((a, b) => {
      const score = (e: HealedEntityRecord) =>
        (e.exhibitQuality === "improved" ? 2 : e.exhibitQuality === "partial" ? 1 : 0) +
        e.improvements.filter((i) => i.improved).length;
      return score(b) - score(a);
    })
    .slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      activeHealed,
      rolledBack,
      uncertain,
      withPublicImprovement,
      exhibitImproved,
    },
    healedEntities,
    confidenceEffectiveness: buildConfidenceEffectiveness(healedEntities),
    rollbackIntelligence: buildRollbackIntelligence(healedEntities, applyByProposal, albumMeta),
    healingMemory: buildHealingMemory(healedEntities),
    exampleHealed,
  };
}
