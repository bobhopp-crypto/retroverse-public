import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { readHealingAuditLog } from "@/lib/healing/read-audit-log";
import type {
  HealingOutcomeRow,
  HealingOutcomeStatus,
  HealingOutcomeSummary,
} from "@/lib/healing/trust-types";

export type { HealingOutcomeRow, HealingOutcomeStatus, HealingOutcomeSummary };

async function loadProposalOutcomes(): Promise<
  {
    id: number;
    rvtr: string;
    album_id: number;
    confidence: number;
    status: string;
    proposed_at: string;
  }[]
> {
  try {
    return await inspectQuery(
      `
      SELECT id, rvtr, album_id, confidence, status, proposed_at::text AS proposed_at
      FROM track_album_link_proposals
      ORDER BY proposed_at DESC
      LIMIT 100
      `,
    );
  } catch {
    return [];
  }
}

export async function loadHealingOutcomeSummary(): Promise<HealingOutcomeSummary> {
  const [audit, proposals] = await Promise.all([
    readHealingAuditLog(),
    loadProposalOutcomes(),
  ]);

  const applyEvents = audit.filter((e) => e.action === "apply");
  const rollbackEvents = audit.filter((e) => e.action === "rollback");
  const applySuccesses = applyEvents.filter((e) => e.ok);
  const applyAttempts = applyEvents.length;

  const retainedRvtrs = new Set<string>();
  for (const p of proposals) {
    if (p.status === "applied") retainedRvtrs.add(p.rvtr.trim().toUpperCase());
  }

  const confidences = [
    ...applySuccesses.map((e) => e.confidence).filter((c): c is number => c != null),
    ...proposals.filter((p) => p.status === "applied").map((p) => p.confidence),
  ];

  const recent: HealingOutcomeRow[] = [];

  for (const e of [...audit].reverse().slice(0, 20)) {
    let status: HealingOutcomeStatus = "uncertain";
    if (e.action === "apply" && e.ok) status = "approved";
    else if (e.action === "apply" && !e.ok) status = "uncertain";
    else if (e.action === "rollback" && e.ok) status = "rolled_back";

    if (e.action === "apply" && e.ok && e.proposalId) {
      const p = proposals.find((x) => x.id === e.proposalId);
      if (p?.status === "applied") status = "retained";
      if (p?.status === "rolled_back") status = "rolled_back";
    }

    recent.push({
      proposalId: e.proposalId ?? null,
      rvtr: e.rvtr,
      albumId: e.albumId ?? null,
      confidence: e.confidence ?? null,
      status,
      ts: e.ts,
      actor: e.actor,
      message: e.message,
    });
  }

  const rolledBack = proposals.filter((p) => p.status === "rolled_back").length;
  const retained = proposals.filter((p) => p.status === "applied").length;
  const approved = applySuccesses.length;

  return {
    totalAuditEvents: audit.length,
    applyAttempts,
    applySuccesses: approved,
    rollbacks: Math.max(rollbackEvents.filter((e) => e.ok).length, rolledBack),
    retained,
    uncertain: Math.max(0, approved - retained),
    rollbackRate:
      approved > 0 ? Math.round((rolledBack / approved) * 1000) / 10 : 0,
    retentionRate:
      approved > 0 ? Math.round((retained / approved) * 1000) / 10 : 0,
    confidenceMin: confidences.length ? Math.min(...confidences) : null,
    confidenceMax: confidences.length ? Math.max(...confidences) : null,
    confidenceAvg:
      confidences.length > 0
        ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000) / 1000
        : null,
    recent,
  };
}
