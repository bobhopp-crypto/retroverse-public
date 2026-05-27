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
import type { HealingDegradedQueue, HealingQueueRow } from "@/lib/healing/load-degraded-queue";

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

export function OpsHealingPanel(props: { queue: HealingDegradedQueue }) {
  const [filter, setFilter] = useState<FilterKey>("grouped");
  const [expandedRvtr, setExpandedRvtr] = useState<string | null>(null);
  const [rowDetails, setRowDetails] = useState<Record<string, HealingQueueRow>>({});
  const [loadingRvtr, setLoadingRvtr] = useState<string | null>(null);

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
    await loadRowAudit(rvtr);
  }

  const counts = props.queue.countsByType;
  const ws = props.queue.workflowSummary;

  return (
    <div className="ops-healing">
      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Restoration desk</h2>
          <OpsPill tone="info">read-only</OpsPill>
        </header>
        <p className="ops-dim">
          What to fix first: cover-critical chart tracks → high-confidence album matches → duplicate
          clusters → weak joins → orphan VDJ variants.
        </p>
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
          return (
            <section key={detail.rvtr} className="ops-panel ops-panel--nested">
              <header className="ops-panel__header">
                <h2 className="ops-panel__title">
                  {detail.rvtr} · {detail.title}
                </h2>
                <OpsPill tone="info">impact {detail.impactScore}</OpsPill>
              </header>
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
                    { key: "conf", label: "Confidence" },
                    { key: "album", label: "Candidate album" },
                    { key: "reasons", label: "Why matched" },
                  ]}
                  rows={detail.candidates.map((c) => ({
                    id: `${detail.rvtr}-${c.albumId}`,
                    tone: toneForConfidence(c.confidence),
                    cells: {
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
                    },
                  }))}
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
