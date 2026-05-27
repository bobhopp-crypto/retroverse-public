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
  type WeightedReason,
} from "@/lib/healing/format-scored-reasons";
import type { HealingDegradedQueue, HealingQueueRow } from "@/lib/healing/load-degraded-queue";

type FilterKey = "all" | "grouped" | "healthy_controls" | HealingDegradationFlag;

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

function WeightedReasonsList(props: { reasons: WeightedReason[] }) {
  if (!props.reasons.length) return null;
  return (
    <ul className="ops-healing__weights">
      {props.reasons.map((r) => (
        <li key={r.key}>
          <span className="ops-healing__weight-label">{r.label}</span>
          <span className={`ops-healing__weight-pts ops-healing__weight-pts--${r.sign}`}>
            {r.sign}
            {r.points}
          </span>
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
    if (filter === "all" || filter === "grouped") return mergedRows;
    return mergedRows.filter((r) => r.degradationFlags.includes(filter));
  }, [filter, mergedRows, props.queue.healthyControls]);

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

  return (
    <div className="ops-healing">
      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Restoration desk</h2>
          <OpsPill tone="info">read-only</OpsPill>
        </header>
        <p className="ops-dim">
          Hot 100 missing album links:{" "}
          <strong>
            {props.queue.summary.hot100MissingLinks.toLocaleString()} /{" "}
            {props.queue.summary.hot100Total.toLocaleString()}
          </strong>{" "}
          ({props.queue.summary.pctMissing}%)
        </p>
        <p className="ops-dim">
          Sample queue <strong>{props.queue.summary.queueSize}</strong> ·{" "}
          {props.queue.duplicateClusters.length} duplicate clusters surfaced · expand for weighted
          candidate audit
        </p>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Healthy reference tracks</h2>
        </header>
        <div className="ops-healing__controls">
          {props.queue.healthyControls.map((control) => (
            <div key={control.rvtr} className="ops-healing__control-card">
              <OpsInlineLink href={`/track/${control.rvtr}`}>{control.controlLabel}</OpsInlineLink>
              <span className="ops-dim">
                {control.rvtr} · links {control.albumLinkCount} · cover ok · conf 1.00
              </span>
            </div>
          ))}
        </div>
      </section>

      {props.queue.duplicateClusters.length > 0 ? (
        <section className="ops-panel">
          <header className="ops-panel__header">
            <h2 className="ops-panel__title">Duplicate clusters (sample)</h2>
          </header>
          <OpsTable
            columns={[
              { key: "title", label: "Cluster" },
              { key: "size", label: "Size" },
              { key: "canonical", label: "Probable canonical" },
              { key: "conf", label: "Dup. conf." },
              { key: "signals", label: "Signals" },
            ]}
            rows={props.queue.duplicateClusters.slice(0, 8).map((c) => ({
              id: c.clusterId,
              tone: c.duplicateConfidence >= 0.7 ? "warn" : "info",
              cells: {
                title: (
                  <>
                    <strong>{c.displayTitle}</strong>
                    <br />
                    <span className="ops-dim">{c.displayArtist}</span>
                  </>
                ),
                size: String(c.clusterSize),
                canonical: (
                  <>
                    <OpsInlineLink href={`/track/${c.probableCanonicalRvtr}`}>
                      {c.probableCanonicalRvtr}
                    </OpsInlineLink>
                    <br />
                    <span className="ops-dim">{c.probableCanonicalLabel}</span>
                  </>
                ),
                conf: (
                  <OpsPill tone={toneForConfidence(c.duplicateConfidence)}>
                    {c.duplicateConfidence.toFixed(2)}
                  </OpsPill>
                ),
                signals: c.signals.join(" · "),
              },
            }))}
          />
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
        ? props.queue.groups.map((group) => (
            <section key={group.groupId} className="ops-panel">
              <header className="ops-panel__header">
                <h2 className="ops-panel__title">
                  {group.label} ({group.rows.length})
                </h2>
              </header>
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
                  <p className="ops-dim">Top match signals (weighted)</p>
                  <WeightedReasonsList reasons={detail.weightedTopReasons} />
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
                      reasons: <WeightedReasonsList reasons={formatWeightedReasons(c.reasons)} />,
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
