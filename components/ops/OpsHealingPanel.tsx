"use client";

import { useMemo, useState } from "react";

import { OpsInlineLink, OpsPill, OpsTable } from "@/components/ops/OpsTable";
import {
  HEALING_DEGRADATION_LABELS,
  primaryHealingCategory,
  type HealingDegradationFlag,
} from "@/lib/healing/degradation";
import {
  formatWeightedReasons,
  formatWeightedReasonsCompact,
  type WeightedReason,
} from "@/lib/healing/format-scored-reasons";
import type {
  HealingDegradedQueue,
  HealingQueueRow,
  HealingScoredCandidate,
} from "@/lib/healing/load-degraded-queue";
import type { HealingRestorationPatterns } from "@/lib/healing/pattern-types";
import type { HealingTrustCalibration } from "@/lib/healing/trust-types";
import type { PublicContinuityReport } from "@/lib/healing/continuity-types";
import type { HealingValidationReport } from "@/lib/healing/validation-types";

const APPROVAL_CONFIDENCE_MIN = 0.45;

type FilterKey =
  | "all"
  | "grouped"
  | "healthy_controls"
  | "high_confidence_match"
  | HealingDegradationFlag;

function toneForConfidence(c: number | null): "ok" | "warn" | "bad" | "info" {
  if (c == null) return "info";
  if (c >= 0.75) return "ok";
  if (c >= 0.45) return "warn";
  return "bad";
}

function confidenceLabel(c: number | null): string {
  if (c == null) return "—";
  return c.toFixed(2);
}

function coverPill(status: HealingQueueRow["coverStatus"]) {
  if (status === "ok") return <OpsPill tone="ok">ok</OpsPill>;
  if (status === "missing") return <OpsPill tone="warn">missing</OpsPill>;
  return <OpsPill tone="bad">no link</OpsPill>;
}

function categoryLabel(flags: HealingDegradationFlag[]): string {
  const primary = primaryHealingCategory(flags);
  if (!primary) return "—";
  return HEALING_DEGRADATION_LABELS[primary];
}

function WeightedReasonsList(props: { reasons: WeightedReason[]; compact?: boolean }) {
  if (!props.reasons.length) return null;
  if (props.compact) {
    return (
      <ul className="ops-healing__weights ops-healing__weights--compact">
        {formatWeightedReasonsCompact(props.reasons).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="ops-healing__weights">
      {props.reasons.map((r) => (
        <li key={r.key}>
          <code className="ops-healing__reason-key">
            {r.sign}
            {r.points} {r.key}
          </code>
          <span className="ops-healing__weight-label">{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

type ApplyNotice = {
  rvtr: string;
  proposalId: number;
  catRowId: number;
  revalidatedPaths: string[];
};

function trustTone(level: string): "ok" | "warn" | "bad" | "info" {
  if (level === "trusted") return "ok";
  if (level === "cautious") return "warn";
  if (level === "risky") return "bad";
  return "info";
}

function trustLabel(level: string): string {
  if (level === "trusted") return "trusted";
  if (level === "cautious") return "cautious";
  if (level === "risky") return "risky";
  return level;
}

export function OpsHealingPanel(props: {
  queue: HealingDegradedQueue;
  trust: HealingTrustCalibration;
  patterns: HealingRestorationPatterns;
  validation: HealingValidationReport;
  continuity: PublicContinuityReport;
  writesEnabled: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("grouped");
  const [expandedRvtr, setExpandedRvtr] = useState<string | null>(null);
  const [rowDetails, setRowDetails] = useState<Record<string, HealingQueueRow>>({});
  const [loadingRvtr, setLoadingRvtr] = useState<string | null>(null);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [applyNotice, setApplyNotice] = useState<ApplyNotice | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const mergedRows = useMemo(
    () => props.queue.rows.map((row) => rowDetails[row.rvtr] ?? row),
    [props.queue.rows, rowDetails],
  );

  const filtered = useMemo(() => {
    if (filter === "healthy_controls") return props.queue.healthyControls;
    if (filter === "high_confidence_match") {
      return mergedRows.filter(
        (r) => r.topConfidence != null && r.topConfidence >= 0.45 && r.albumLinkCount === 0,
      );
    }
    if (filter === "all" || filter === "grouped") return mergedRows;
    return mergedRows.filter((r) => r.degradationFlags.includes(filter));
  }, [filter, mergedRows, props.queue.healthyControls]);

  const groupedSections = useMemo(() => {
    if (filter !== "grouped") return props.queue.groups;
    return props.queue.groups;
  }, [filter, props.queue.groups]);

  async function loadRowAudit(rvtr: string) {
    if (rowDetails[rvtr]?.candidates.length) return;
    setLoadingRvtr(rvtr);
    try {
      const res = await fetch(`/api/ops/healing/review?rvtr=${encodeURIComponent(rvtr)}`);
      const data = (await res.json()) as { ok: boolean; row?: HealingQueueRow };
      if (res.ok && data.ok && data.row) {
        setRowDetails((prev) => ({ ...prev, [rvtr]: data.row! }));
      }
    } finally {
      setLoadingRvtr(null);
    }
  }

  async function toggleExpand(rvtr: string) {
    if (expandedRvtr === rvtr) {
      setExpandedRvtr(null);
      return;
    }
    setExpandedRvtr(rvtr);
    setApplyError(null);
    await loadRowAudit(rvtr);
  }

  function canApproveCandidate(detail: HealingQueueRow, candidate: HealingScoredCandidate): boolean {
    return (
      props.writesEnabled &&
      detail.albumLinkCount === 0 &&
      detail.healingState !== "linked" &&
      candidate.confidence >= APPROVAL_CONFIDENCE_MIN
    );
  }

  async function approveCandidate(detail: HealingQueueRow, candidate: HealingScoredCandidate) {
    if (!canApproveCandidate(detail, candidate)) return;

    const confirmed = window.confirm(
      [
        "Approve candidate album link?",
        "",
        `${detail.rvtr} → album ${candidate.albumId}`,
        `"${candidate.albumTitle}" · ${candidate.artistName}`,
        `match confidence ${candidate.confidence.toFixed(2)}`,
        `curator trust ${candidate.trust.level} (${candidate.trust.trustScore.toFixed(2)})`,
        candidate.trust.curatorNote,
        "",
        "Writes ONE canonical_album_tracks row (healing_approved).",
        "No merge. No replace. Reversible via rollback.",
        "",
        "Continue?",
      ].join("\n"),
    );
    if (!confirmed) return;

    const applyKey = `${detail.rvtr}-${candidate.albumId}`;
    setApplyingKey(applyKey);
    setApplyError(null);
    try {
      const res = await fetch("/api/ops/healing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rvtr: detail.rvtr,
          albumId: candidate.albumId,
          position: candidate.trackPosition,
          sequenceTitle: candidate.sequenceTitle ?? detail.title,
          confidence: candidate.confidence,
          reasons: candidate.reasons,
          sourceKind: candidate.sourceKind,
          actor: "ops/healing-ui",
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        proposalId?: number;
        catRowId?: number;
        revalidatedPaths?: string[];
        message?: string;
        code?: string;
      };
      if (!res.ok || !data.ok) {
        setApplyError(data.message || data.code || "Apply failed.");
        return;
      }

      setApplyNotice({
        rvtr: detail.rvtr,
        proposalId: data.proposalId!,
        catRowId: data.catRowId!,
        revalidatedPaths: data.revalidatedPaths ?? [],
      });

      const refreshed = await fetch(
        `/api/ops/healing/review?rvtr=${encodeURIComponent(detail.rvtr)}`,
      );
      const refreshedData = (await refreshed.json()) as { ok: boolean; row?: HealingQueueRow };
      if (refreshed.ok && refreshedData.ok && refreshedData.row) {
        setRowDetails((prev) => ({ ...prev, [detail.rvtr]: refreshedData.row! }));
      }
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingKey(null);
    }
  }

  async function rollbackLastApply() {
    if (!applyNotice) return;
    const confirmed = window.confirm(
      `Rollback proposal #${applyNotice.proposalId}?\n\nDeletes healing_approved row #${applyNotice.catRowId} only.`,
    );
    if (!confirmed) return;
    setApplyingKey("rollback");
    setApplyError(null);
    try {
      const res = await fetch("/api/ops/healing/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: applyNotice.proposalId,
          actor: "ops/healing-ui",
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setApplyError(data.message || "Rollback failed.");
        return;
      }
      setApplyNotice(null);
      await loadRowAudit(applyNotice.rvtr);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingKey(null);
    }
  }

  const counts = props.queue.countsByType;
  const ws = props.queue.workflowSummary;
  const tc = props.trust;
  const pat = props.patterns;
  const val = props.validation;
  const cont = props.continuity;

  return (
    <div className="ops-healing">
      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Public continuity</h2>
          <OpsPill tone="info">/track exhibit</OpsPill>
        </header>
        <p className="ops-dim">
          Verifies what visitors see on the track page — not just graph rows.
        </p>
        <p className="ops-dim">
          Verified {cont.summary.verified} · more complete {cont.summary.moreComplete} · partial{" "}
          {cont.summary.partialGain} · cover gain {cont.summary.withCoverGain} · album shelf gain{" "}
          {cont.summary.withAlbumShelfGain}
        </p>
        {cont.verifications.length === 0 ? (
          <p className="ops-dim">
            No heals to verify yet — after approve, reload to compare public before/after snapshots.
          </p>
        ) : (
          <>
            {cont.highImpact.length > 0 ? (
              <>
                <h3 className="ops-healing__trust-heading">Highest public impact</h3>
                <ul className="ops-healing__trust-list">
                  {cont.highImpact.map((h) => (
                    <li key={h.rvtr}>
                      <OpsInlineLink href={h.trackHref}>{h.rvtr}</OpsInlineLink> · {h.title} · score{" "}
                      {h.score}
                      <br />
                      <span className="ops-dim">{h.note}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {cont.examples.length > 0 ? (
              <>
                <h3 className="ops-healing__trust-heading">Before / after snapshots</h3>
                {cont.examples.map((v) => (
                  <div key={v.proposalId} className="ops-healing__family-card">
                    <p className="ops-healing__cluster-title">
                      <OpsInlineLink href={v.before.trackHref}>{v.rvtr}</OpsInlineLink>
                      {" · "}
                      <OpsPill tone={v.verdict === "more_complete" ? "ok" : "warn"}>
                        {v.verdict}
                      </OpsPill>
                    </p>
                    <p className="ops-dim">{v.trustAnswer}</p>
                    <p className="ops-dim">
                      <strong>Before:</strong> {v.before.pacingNote}
                      {v.before.albumCount === 0 ? " · no album shelf" : ""}
                      {!v.before.coverVisible ? " · no hero cover" : ""}
                    </p>
                    {v.after ? (
                      <p className="ops-dim">
                        <strong>After:</strong> {v.after.pacingNote}
                        {v.after.albumLabels.length > 0
                          ? ` · albums: ${v.after.albumLabels.slice(0, 3).join(", ")}`
                          : ""}
                        {v.after.coverVisible ? " · cover visible" : " · cover still missing"}
                      </p>
                    ) : null}
                    <ul className="ops-healing__trust-list">
                      {v.signals.map((s) => (
                        <li key={s.kind}>
                          {s.improved ? "✓" : "·"} {s.label}: {s.before} → {s.after}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            ) : null}
          </>
        )}
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Post-healing validation</h2>
          <OpsPill tone="info">effectiveness</OpsPill>
        </header>
        <p className="ops-dim">
          Did healing improve public continuity? Before/after graph state — not a fix counter.
        </p>
        <p className="ops-dim">
          Active {val.summary.activeHealed} · rolled back {val.summary.rolledBack} · uncertain{" "}
          {val.summary.uncertain} · with measurable improvement {val.summary.withPublicImprovement}{" "}
          · exhibit improved {val.summary.exhibitImproved}
        </p>
        {val.healedEntities.length === 0 ? (
          <p className="ops-dim">No retained or rolled-back heals yet — approve one candidate to begin validation history.</p>
        ) : (
          <>
            <h3 className="ops-healing__trust-heading">Healed entities</h3>
            <OpsTable
              columns={[
                { key: "rvtr", label: "RVTR" },
                { key: "when", label: "Healed" },
                { key: "conf", label: "Conf." },
                { key: "life", label: "Status" },
                { key: "family", label: "Family" },
                { key: "exhibit", label: "Exhibit" },
              ]}
              rows={val.healedEntities.slice(0, 12).map((e) => ({
                id: String(e.proposalId),
                tone:
                  e.lifecycle === "active"
                    ? e.exhibitQuality === "improved"
                      ? "ok"
                      : "warn"
                    : e.lifecycle === "rolled_back"
                      ? "bad"
                      : "info",
                cells: {
                  rvtr: (
                    <OpsInlineLink href={`/track/${e.rvtr}`}>{e.rvtr}</OpsInlineLink>
                  ),
                  when: e.healedAt.slice(0, 10),
                  conf: e.confidenceAtApply.toFixed(2),
                  life: e.lifecycle,
                  family: e.restorationFamilyName ?? "—",
                  exhibit: e.exhibitQuality,
                },
              }))}
            />
            {val.exampleHealed.length > 0 ? (
              <>
                <h3 className="ops-healing__trust-heading">Example improvements</h3>
                {val.exampleHealed.map((e) => (
                  <div key={e.proposalId} className="ops-healing__family-card">
                    <p className="ops-healing__cluster-title">
                      <OpsInlineLink href={`/track/${e.rvtr}`}>{e.rvtr}</OpsInlineLink>
                      {e.albumTitle ? ` → ${e.albumTitle}` : ""}
                      {" · "}
                      <OpsPill tone={e.exhibitQuality === "improved" ? "ok" : "warn"}>
                        {e.exhibitQuality}
                      </OpsPill>
                    </p>
                    <p className="ops-dim">{e.curatorVerdict}</p>
                    <ul className="ops-healing__trust-list">
                      {e.improvements.map((i) => (
                        <li key={i.kind}>
                          {i.improved ? "✓" : "·"} {i.label}: {i.before} → {i.after}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            ) : null}
            <h3 className="ops-healing__trust-heading">Confidence effectiveness</h3>
            <ul className="ops-healing__trust-list">
              {val.confidenceEffectiveness.map((b) => (
                <li key={b.band}>
                  <strong>{b.band}</strong> ({b.range}) — retained {b.retained}/{b.applies}{" "}
                  ({b.retentionRate}%)
                  <br />
                  <span className="ops-dim">{b.observation}</span>
                </li>
              ))}
            </ul>
            {val.rollbackIntelligence.length > 0 ? (
              <>
                <h3 className="ops-healing__trust-heading">Rollback intelligence</h3>
                <ul className="ops-healing__trust-list">
                  {val.rollbackIntelligence.map((r) => (
                    <li key={r.cause}>
                      <OpsPill tone="bad">{r.count}</OpsPill> <strong>{r.cause}</strong>
                      {r.examples.length > 0 ? ` — e.g. ${r.examples.join(", ")}` : ""}
                      <br />
                      <span className="ops-dim">{r.note}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h3 className="ops-healing__trust-heading">Healing memory</h3>
            <ul className="ops-healing__trust-list">
              {val.healingMemory.map((m) => (
                <li key={m.key}>
                  <OpsPill
                    tone={
                      m.outcome === "stable"
                        ? "ok"
                        : m.outcome === "failed"
                          ? "bad"
                          : "warn"
                    }
                  >
                    {m.outcome}
                  </OpsPill>{" "}
                  <strong>{m.key}</strong> — {m.retained}/{m.applies} retained
                  <br />
                  <span className="ops-dim">{m.note}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Restoration patterns</h2>
          <OpsPill tone="info">read-only</OpsPill>
        </header>
        <p className="ops-dim">
          Recurring degradation families and fix classes — recognition only, not automation.
        </p>
        {pat.families.length > 0 ? (
          <div className="ops-healing__family-list">
            {pat.families.map((f) => (
              <div key={f.id} className="ops-healing__family-card">
                <p className="ops-healing__cluster-title">
                  <strong>{f.name}</strong>
                  {f.approximateCount != null ? (
                    <span className="ops-dim">
                      {" "}
                      · ~{f.approximateCount.toLocaleString()}{" "}
                      {f.countSource === "corpus" ? "(corpus)" : "(sample)"}
                    </span>
                  ) : null}
                </p>
                <p className="ops-dim">{f.strategy}</p>
                {f.examples.length > 0 ? (
                  <p className="ops-dim">
                    Examples:{" "}
                    {f.examples.map((ex) => (
                      <span key={ex.rvtr}>
                        <OpsInlineLink href={`/track/${ex.rvtr}`}>{ex.rvtr}</OpsInlineLink>
                        {" · "}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <h3 className="ops-healing__trust-heading">Safe-fix patterns</h3>
        <ul className="ops-healing__trust-list">
          {pat.safeFixPatterns.map((p) => (
            <li key={p.pattern}>
              <OpsPill tone={p.reliability === "high" ? "ok" : "warn"}>{p.reliability}</OpsPill>{" "}
              <span className="ops-healing__pattern-name">{p.pattern}</span>
              <span className="ops-dim">
                {" "}
                · {p.confidenceRange} — {p.note}
                {p.sampleCount > 0 ? ` (${p.sampleCount} in sample)` : ""}
              </span>
            </li>
          ))}
        </ul>
        <h3 className="ops-healing__trust-heading">Dangerous patterns</h3>
        <ul className="ops-healing__trust-list">
          {pat.dangerousPatterns.map((p) => (
            <li key={p.pattern}>
              <OpsPill tone="bad">risk</OpsPill>{" "}
              <strong>{p.pattern}</strong>
              <span className="ops-dim"> — {p.whyDangerous}</span>
              <br />
              <span className="ops-dim">False positive: {p.falsePositiveBehavior}</span>
              {p.sampleCount > 0 ? (
                <span className="ops-dim"> · {p.sampleCount} in sample</span>
              ) : null}
            </li>
          ))}
        </ul>
        <h3 className="ops-healing__trust-heading">Era restoration</h3>
        <ul className="ops-healing__trust-list">
          {pat.eraObservations.map((e) => (
            <li key={e.era}>
              <strong>{e.era}</strong> — {e.observation}
              <br />
              <span className="ops-dim">{e.restorationCharacter}</span>
            </li>
          ))}
        </ul>
        <h3 className="ops-healing__trust-heading">Confidence reliability</h3>
        <p className="ops-dim">{pat.confidenceReliability.summary}</p>
        <ul className="ops-healing__trust-list">
          {pat.confidenceReliability.bands.map((b) => (
            <li key={b.band}>
              <strong>{b.band}</strong> — match {b.matchConfidence}, trust {b.curatorTrust}
              <br />
              <span className="ops-dim">{b.observation}</span>
            </li>
          ))}
        </ul>
        <p className="ops-dim">{pat.confidenceReliability.rollbackNote}</p>
        <p className="ops-dim">{pat.confidenceReliability.uncertaintyNote}</p>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Trust calibration</h2>
          <OpsPill tone="info">human-curated</OpsPill>
        </header>
        <p className="ops-dim">
          Signals only — compilation and duplicate risk lower trust visibility; they do not block
          approval.
        </p>
        <div className="ops-healing__trust-grid">
          <div className="ops-healing__trust-card">
            <h3 className="ops-healing__trust-heading">Healing outcomes</h3>
            <p className="ops-dim">
              Applies {tc.outcomes.applySuccesses}/{tc.outcomes.applyAttempts} · rollbacks{" "}
              {tc.outcomes.rollbacks} ({tc.outcomes.rollbackRate}%) · retained {tc.outcomes.retained}{" "}
              ({tc.outcomes.retentionRate}%)
            </p>
            <p className="ops-dim">
              Confidence range{" "}
              {tc.outcomes.confidenceMin != null
                ? `${tc.outcomes.confidenceMin.toFixed(2)}–${tc.outcomes.confidenceMax?.toFixed(2)}`
                : "—"}{" "}
              {tc.outcomes.confidenceAvg != null
                ? `(avg ${tc.outcomes.confidenceAvg.toFixed(2)})`
                : ""}
            </p>
            {tc.outcomes.recent.length > 0 ? (
              <ul className="ops-healing__trust-list">
                {tc.outcomes.recent.slice(0, 6).map((o) => (
                  <li key={`${o.ts}-${o.rvtr}-${o.status}`}>
                    <OpsPill
                      tone={
                        o.status === "retained" || o.status === "approved"
                          ? "ok"
                          : o.status === "rolled_back"
                            ? "bad"
                            : "warn"
                      }
                    >
                      {o.status}
                    </OpsPill>{" "}
                    <OpsInlineLink href={`/track/${o.rvtr}`}>{o.rvtr}</OpsInlineLink>
                    {o.confidence != null ? ` · ${o.confidence.toFixed(2)}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ops-dim">No healing audit events yet.</p>
            )}
          </div>
          <div className="ops-healing__trust-card">
            <h3 className="ops-healing__trust-heading">Candidate quality patterns</h3>
            <ul className="ops-healing__trust-list">
              {tc.qualityPatterns.map((p) => (
                <li key={p.pattern}>
                  <OpsPill
                    tone={p.strength === "strong" ? "ok" : p.strength === "weak" ? "warn" : "bad"}
                  >
                    {p.strength}
                  </OpsPill>{" "}
                  <span className="ops-healing__pattern-name">{p.pattern}</span>
                  <span className="ops-dim"> — {p.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {tc.eraPatterns.length > 0 ? (
          <>
            <h3 className="ops-healing__trust-heading">Era degradation (Hot 100)</h3>
            <OpsTable
              columns={[
                { key: "era", label: "Era" },
                { key: "links", label: "Missing links" },
                { key: "cover", label: "Missing cover" },
                { key: "vdj", label: "Orphan VDJ" },
                { key: "note", label: "Note" },
              ]}
              rows={tc.eraPatterns.map((e) => ({
                id: e.era,
                cells: {
                  era: <strong>{e.era}</strong>,
                  links: e.missingAlbumLinks.toLocaleString(),
                  cover: e.missingCovers.toLocaleString(),
                  vdj: e.orphanVdj.toLocaleString(),
                  note: <span className="ops-dim">{e.note}</span>,
                },
              }))}
            />
          </>
        ) : null}
        {tc.duplicateDistortion.length > 0 ? (
          <>
            <h3 className="ops-healing__trust-heading">Duplicate RVTR distortion</h3>
            <div className="ops-healing__distortion-list">
              {tc.duplicateDistortion.slice(0, 6).map((d) => (
                <div key={d.clusterId} className="ops-healing__distortion-row">
                  <OpsPill
                    tone={
                      d.distortionRisk === "high"
                        ? "bad"
                        : d.distortionRisk === "medium"
                          ? "warn"
                          : "info"
                    }
                  >
                    {d.distortionRisk}
                  </OpsPill>{" "}
                  <strong>{d.displayTitle}</strong> · {d.displayArtist} · ×{d.clusterSize} · root{" "}
                  <OpsInlineLink href={`/track/${d.probableCanonicalRvtr}`}>
                    {d.probableCanonicalRvtr}
                  </OpsInlineLink>
                  <span className="ops-dim"> — {d.note}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        {tc.dangerousCandidates.length > 0 ? (
          <>
            <h3 className="ops-healing__trust-heading">Dangerous candidates (sample)</h3>
            <OpsTable
              columns={[
                { key: "rvtr", label: "RVTR" },
                { key: "album", label: "Candidate" },
                { key: "match", label: "Match" },
                { key: "trust", label: "Trust" },
                { key: "flags", label: "Risk flags" },
              ]}
              rows={tc.dangerousCandidates.map((d) => ({
                id: `${d.rvtr}-${d.albumId}`,
                tone: "bad",
                cells: {
                  rvtr: (
                    <OpsInlineLink href={`/track/${d.rvtr}`}>
                      {d.rvtr}
                    </OpsInlineLink>
                  ),
                  album: (
                    <>
                      <strong>{d.albumTitle}</strong>
                      <br />
                      <span className="ops-dim">
                        {d.title} · {d.artistName}
                      </span>
                    </>
                  ),
                  match: d.matchConfidence.toFixed(2),
                  trust: d.trustScore.toFixed(2),
                  flags: d.riskFlags.join(", ") || "—",
                },
              }))}
            />
          </>
        ) : null}
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Restoration desk</h2>
          <OpsPill tone="info">read-only</OpsPill>
        </header>
        <p className="ops-dim">
          What to fix first: cover-critical chart tracks → high-confidence album matches → duplicate
          clusters → weak joins → orphan VDJ variants.
        </p>
        {props.writesEnabled ? (
          <p className="ops-notice">
            Controlled writes enabled (RETROVERSE_HEALING_APPLY=1) — one approve per candidate,
            explicit confirm only.
          </p>
        ) : (
          <p className="ops-dim">
            Writes disabled — set RETROVERSE_HEALING_APPLY=1 locally to enable Approve Candidate
            Album.
          </p>
        )}
        {applyNotice ? (
          <p className="ops-notice">
            Healed <OpsInlineLink href={`/track/${applyNotice.rvtr}`}>{applyNotice.rvtr}</OpsInlineLink>{" "}
            · proposal #{applyNotice.proposalId} · cat #{applyNotice.catRowId}
            {applyNotice.revalidatedPaths.length > 0
              ? ` · revalidated ${applyNotice.revalidatedPaths.join(", ")}`
              : ""}
            {" · "}
            <button type="button" className="ops-link--button" onClick={rollbackLastApply}>
              Rollback
            </button>
          </p>
        ) : null}
        {applyError ? <p className="ops-banner ops-banner--bad">{applyError}</p> : null}
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Workflow summary</h2>
        </header>
        <div className="ops-healing__summary">
          <SummaryCard
            label="Cover-Critical"
            value={ws.coverCritical.toLocaleString()}
            tone="bad"
            active={filter === "cover_critical"}
            onClick={() => setFilter("cover_critical")}
          />
          <SummaryCard
            label="Missing Album Links"
            value={ws.missingAlbumLinks.toLocaleString()}
            tone="warn"
            active={filter === "missing_album_links"}
            onClick={() => setFilter("missing_album_links")}
          />
          <SummaryCard
            label="Duplicate Clusters"
            value={ws.duplicateClusters.toLocaleString()}
            tone="warn"
            active={filter === "duplicate_rvtr"}
            onClick={() => setFilter("duplicate_rvtr")}
          />
          <SummaryCard
            label="Orphan Variants"
            value={ws.orphanVariants.toLocaleString()}
            tone="info"
            active={filter === "orphan_vdj"}
            onClick={() => setFilter("orphan_vdj")}
          />
          <SummaryCard
            label="Healthy Controls"
            value={String(ws.healthyControls)}
            tone="ok"
            active={filter === "healthy_controls"}
            onClick={() => setFilter("healthy_controls")}
          />
        </div>
        <p className="ops-dim">
          Sample: {props.queue.summary.queueSize} tracks · high-confidence in sample:{" "}
          <strong>{ws.highConfidenceInSample}</strong> · Hot 100 missing links:{" "}
          {props.queue.summary.pctMissing}%
        </p>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Healthy enrichment integrity</h2>
        </header>
        <OpsTable
          columns={[
            { key: "track", label: "Reference" },
            { key: "rvtr", label: "RVTR" },
            { key: "chart", label: "Chart" },
            { key: "links", label: "Album links" },
            { key: "cover", label: "Cover" },
            { key: "conf", label: "Confidence" },
          ]}
          rows={props.queue.healthyControls.map((c) => ({
            id: c.rvtr,
            tone: "ok",
            cells: {
              track: <strong>{c.controlLabel}</strong>,
              rvtr: <OpsInlineLink href={`/track/${c.rvtr}`}>{c.rvtr}</OpsInlineLink>,
              chart: c.chartStatus,
              links: String(c.albumLinkCount),
              cover: coverPill(c.coverStatus),
              conf: <OpsPill tone="ok">1.00</OpsPill>,
            },
          }))}
        />
      </section>

      {props.queue.duplicateClusters.length > 0 ? (
        <section className="ops-panel">
          <header className="ops-panel__header">
            <h2 className="ops-panel__title">Duplicate clusters (fragmented RVTRs)</h2>
          </header>
          {props.queue.duplicateClusters.slice(0, 6).map((c) => (
            <div key={c.clusterId} className="ops-healing__cluster-card">
              <p className="ops-healing__cluster-title">
                <strong>{c.displayTitle}</strong> · {c.displayArtist}
              </p>
              <p className="ops-dim">
                Size {c.clusterSize} · dup conf{" "}
                <strong>{c.duplicateConfidence.toFixed(2)}</strong> · year spread {c.yearSpread} ·
                chart {c.totalChartWeeks}w total · VDJ {c.vdjMemberCount}/{c.clusterSize}
              </p>
              <p className="ops-dim">
                Variants:{" "}
                {c.memberRvtrs.map((rvtr) => (
                  <span key={rvtr}>
                    <OpsInlineLink href={`/track/${rvtr}`}>{rvtr}</OpsInlineLink>
                    {rvtr === c.probableCanonicalRvtr ? " (canonical)" : ""}
                    {" · "}
                  </span>
                ))}
              </p>
              {c.linkedVariantRvtrs.length > 0 ? (
                <p className="ops-dim">Linked variants: {c.linkedVariantRvtrs.join(", ")}</p>
              ) : (
                <p className="ops-dim">Linked variants: none</p>
              )}
            </div>
          ))}
        </section>
      ) : null}

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Filters</h2>
        </header>
        <div className="ops-healing__filters">
          <FilterButton
            active={filter === "grouped"}
            label="Grouped queue"
            onClick={() => setFilter("grouped")}
          />
          <FilterButton
            active={filter === "all"}
            label={`Flat (${props.queue.rows.length})`}
            onClick={() => setFilter("all")}
          />
          <FilterButton
            active={filter === "cover_critical"}
            label={`Cover-critical (${counts.cover_critical.toLocaleString()})`}
            onClick={() => setFilter("cover_critical")}
          />
          <FilterButton
            active={filter === "high_confidence_match"}
            label={`High conf. match (${ws.highConfidenceInSample} sample)`}
            onClick={() => setFilter("high_confidence_match")}
          />
          <FilterButton
            active={filter === "missing_cover"}
            label={`Missing Covers (${counts.missing_cover.toLocaleString()})`}
            onClick={() => setFilter("missing_cover")}
          />
          <FilterButton
            active={filter === "missing_album_links"}
            label={`Missing Album Links (${counts.missing_album_links.toLocaleString()})`}
            onClick={() => setFilter("missing_album_links")}
          />
          <FilterButton
            active={filter === "duplicate_rvtr"}
            label={`Duplicate Clusters (${counts.duplicate_rvtr.toLocaleString()})`}
            onClick={() => setFilter("duplicate_rvtr")}
          />
          <FilterButton
            active={filter === "orphan_vdj"}
            label={`Orphan Variants (${counts.orphan_vdj.toLocaleString()})`}
            onClick={() => setFilter("orphan_vdj")}
          />
          <FilterButton
            active={filter === "weak_confidence_join"}
            label={`Weak Joins (${counts.weak_confidence_join.toLocaleString()})`}
            onClick={() => setFilter("weak_confidence_join")}
          />
          <FilterButton
            active={filter === "healthy_controls"}
            label={`Healthy Controls (${props.queue.healthyControls.length})`}
            onClick={() => setFilter("healthy_controls")}
          />
        </div>
      </section>

      {filter === "grouped"
        ? groupedSections.map((group) => (
            <section key={`${group.groupId}-${group.label}`} className="ops-panel">
              <header className="ops-panel__header">
                <h2 className="ops-panel__title">
                  {group.label} ({group.rows.length})
                </h2>
              </header>
              <p className="ops-dim ops-healing__workflow-hint">{group.workflowHint}</p>
              <TrackTable
                rows={group.rows.map((r) => rowDetails[r.rvtr] ?? r)}
                expandedRvtr={expandedRvtr}
                loadingRvtr={loadingRvtr}
                onToggleExpand={toggleExpand}
              />
            </section>
          ))
        : (
            <section className="ops-panel">
              <header className="ops-panel__header">
                <h2 className="ops-panel__title">Tracks ({filtered.length})</h2>
              </header>
              <TrackTable
                rows={filtered as HealingQueueRow[]}
                expandedRvtr={expandedRvtr}
                loadingRvtr={loadingRvtr}
                onToggleExpand={toggleExpand}
              />
            </section>
          )}

      {mergedRows
        .filter((item) => expandedRvtr === item.rvtr)
        .map((item) => {
          const detail = rowDetails[item.rvtr] ?? item;
          const family = pat.byRvtr[detail.rvtr];
          return (
            <section key={detail.rvtr} className="ops-panel ops-panel--nested">
              <header className="ops-panel__header">
                <h2 className="ops-panel__title">
                  {detail.rvtr} · {detail.title}
                </h2>
                <OpsPill tone="info">impact {detail.impactScore}</OpsPill>
              </header>
              {family ? (
                <p className="ops-notice">
                  <strong>{family.name}</strong> — {family.guidance}
                  <br />
                  <span className="ops-dim">Strategy: {family.strategy}</span>
                </p>
              ) : null}
              {detail.duplicateCluster ? (
                <p className="ops-dim ops-healing__dup-note">
                  Duplicate cluster ×{detail.duplicateCluster.clusterSize} · probable{" "}
                  <OpsInlineLink href={`/track/${detail.duplicateCluster.probableCanonicalRvtr}`}>
                    {detail.duplicateCluster.probableCanonicalRvtr}
                  </OpsInlineLink>{" "}
                  · dup conf {detail.duplicateCluster.duplicateConfidence.toFixed(2)}
                </p>
              ) : null}
              {loadingRvtr === detail.rvtr ? (
                <p className="ops-dim">Loading candidate audit…</p>
              ) : null}
              {detail.weightedTopReasons.length > 0 ? (
                <>
                  <p className="ops-dim">Top match signals (strongest first)</p>
                  <WeightedReasonsList reasons={detail.weightedTopReasons} compact />
                </>
              ) : null}
              <ul className="ops-dim" style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
                {detail.diagnosis.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {detail.candidates.length > 0 ? (
                <OpsTable
                  columns={[
                    { key: "trust", label: "Trust" },
                    { key: "conf", label: "Match" },
                    { key: "album", label: "Candidate album" },
                    { key: "reasons", label: "Why matched" },
                    { key: "action", label: "Action", align: "right" },
                  ]}
                  rows={detail.candidates.map((c) => {
                    const applyKey = `${detail.rvtr}-${c.albumId}`;
                    const showApprove = canApproveCandidate(detail, c);
                    return {
                      id: applyKey,
                      tone: trustTone(c.trust.level),
                      cells: {
                        trust: (
                          <>
                            <OpsPill tone={trustTone(c.trust.level)}>
                              {trustLabel(c.trust.level)} {c.trust.trustScore.toFixed(2)}
                            </OpsPill>
                            {c.trust.compilation.level !== "none" ? (
                              <>
                                <br />
                                <span className="ops-dim">{c.trust.compilation.label}</span>
                              </>
                            ) : null}
                            {c.trust.riskFlags.length > 0 ? (
                              <>
                                <br />
                                <span className="ops-dim">{c.trust.riskFlags.join(" · ")}</span>
                              </>
                            ) : null}
                          </>
                        ),
                        conf: (
                          <OpsPill tone={toneForConfidence(c.confidence)}>
                            {c.confidence.toFixed(2)}
                          </OpsPill>
                        ),
                        album: (
                          <>
                            <strong>{c.albumTitle}</strong>
                            <br />
                            <span className="ops-dim">
                              {c.artistName} · {c.releaseYear ?? "?"} · id {c.albumId}
                            </span>
                            {c.sequenceTitle ? (
                              <>
                                <br />
                                <span className="ops-dim">
                                  slot #{c.trackPosition ?? "?"} &quot;{c.sequenceTitle}&quot;
                                </span>
                              </>
                            ) : null}
                          </>
                        ),
                        reasons: (
                          <WeightedReasonsList
                            reasons={formatWeightedReasons(c.reasons)}
                            compact
                          />
                        ),
                        action: showApprove ? (
                          <button
                            type="button"
                            className="ops-btn ops-btn--ok"
                            disabled={applyingKey === applyKey}
                            onClick={() => approveCandidate(detail, c)}
                          >
                            {applyingKey === applyKey ? "…" : "Approve"}
                          </button>
                        ) : (
                          <span className="ops-dim">
                            {c.confidence < APPROVAL_CONFIDENCE_MIN
                              ? "<0.45"
                              : detail.albumLinkCount > 0
                                ? "linked"
                                : "—"}
                          </span>
                        ),
                      },
                    };
                  })}
                />
              ) : loadingRvtr !== detail.rvtr ? (
                <p className="ops-empty">No candidates — likely needs album ingest.</p>
              ) : null}
            </section>
          );
        })}
    </div>
  );
}

function TrackTable(props: {
  rows: HealingQueueRow[];
  expandedRvtr: string | null;
  loadingRvtr: string | null;
  onToggleExpand: (rvtr: string) => void;
}) {
  return (
    <OpsTable
      empty="No tracks in this group."
      columns={[
        { key: "rvtr", label: "RVTR" },
        { key: "artist", label: "Artist" },
        { key: "title", label: "Title" },
        { key: "year", label: "Year" },
        { key: "chart", label: "Chart" },
        { key: "links", label: "Links" },
        { key: "cover", label: "Cover" },
        { key: "cands", label: "Cands" },
        { key: "category", label: "Category" },
        { key: "conf", label: "Conf." },
        { key: "impact", label: "Impact" },
        { key: "detail", label: "", align: "right" },
      ]}
      rows={props.rows.map((item) => ({
        id: item.rvtr,
        tone: toneForConfidence(item.topConfidence),
        cells: {
          rvtr: <OpsInlineLink href={`/track/${item.rvtr}`}>{item.rvtr}</OpsInlineLink>,
          artist: item.artistName || "—",
          title: (
            <>
              <strong>{item.title || "—"}</strong>
              {item.duplicateCluster ? (
                <>
                  <br />
                  <span className="ops-dim">
                    dup ×{item.duplicateCluster.clusterSize} ·{" "}
                    {item.duplicateCluster.duplicateConfidence.toFixed(2)}
                  </span>
                </>
              ) : null}
            </>
          ),
          year: item.releaseYear ?? "—",
          chart: item.chartStatus,
          links: String(item.albumLinkCount),
          cover: coverPill(item.coverStatus),
          cands: item.candidateCount > 0 ? String(item.candidateCount) : "—",
          category: categoryLabel(item.degradationFlags),
          conf: (
            <OpsPill tone={toneForConfidence(item.topConfidence)}>
              {confidenceLabel(item.topConfidence)}
            </OpsPill>
          ),
          impact: <span className="ops-dim">{item.impactScore}</span>,
          detail: (
            <button
              type="button"
              className="ops-btn ops-btn--info"
              disabled={props.loadingRvtr === item.rvtr}
              onClick={() => props.onToggleExpand(item.rvtr)}
            >
              {props.loadingRvtr === item.rvtr
                ? "…"
                : props.expandedRvtr === item.rvtr
                  ? "Hide"
                  : "Candidates"}
            </button>
          ),
        },
      }))}
    />
  );
}

function SummaryCard(props: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad" | "info";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`ops-healing__summary-card ops-healing__summary-card--${props.tone}${
        props.active ? " ops-healing__summary-card--active" : ""
      }`}
      onClick={props.onClick}
    >
      <span className="ops-healing__summary-value">{props.value}</span>
      <span className="ops-healing__summary-label">{props.label}</span>
    </button>
  );
}

function FilterButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`ops-healing__filter${props.active ? " ops-healing__filter--active" : ""}`}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}
