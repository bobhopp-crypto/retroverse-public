"use client";

import { useMemo, useState } from "react";

import { OpsInlineLink, OpsPill, OpsTable } from "@/components/ops/OpsTable";
import {
  HEALING_DEGRADATION_LABELS,
  primaryHealingCategory,
  type HealingDegradationFlag,
} from "@/lib/healing/degradation";
import type { HealingDegradedQueue, HealingQueueRow } from "@/lib/healing/load-degraded-queue";

type FilterKey = "all" | "healthy_controls" | HealingDegradationFlag;

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

export function OpsHealingPanel(props: { queue: HealingDegradedQueue }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedRvtr, setExpandedRvtr] = useState<string | null>(null);
  const [rowDetails, setRowDetails] = useState<Record<string, HealingQueueRow>>({});
  const [loadingRvtr, setLoadingRvtr] = useState<string | null>(null);

  const mergedRows = useMemo(
    () => props.queue.rows.map((row) => rowDetails[row.rvtr] ?? row),
    [props.queue.rows, rowDetails],
  );

  const filtered = useMemo(() => {
    if (filter === "healthy_controls") return props.queue.healthyControls;
    if (filter === "all") return mergedRows;
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
          <h2 className="ops-panel__title">Healing console</h2>
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
          Queue sample: <strong>{props.queue.summary.queueSize}</strong> tracks · expand row
          for candidate audit · no apply / merge / auto-fix
        </p>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Filters</h2>
        </header>
        <div className="ops-healing__filters">
          <FilterButton
            active={filter === "all"}
            label={`All (${props.queue.rows.length})`}
            onClick={() => setFilter("all")}
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
            label={`Duplicate Candidates (${counts.duplicate_rvtr.toLocaleString()})`}
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

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Tracks ({filtered.length})</h2>
        </header>
        <OpsTable
          empty="No tracks match this filter."
          columns={[
            { key: "rvtr", label: "RVTR" },
            { key: "artist", label: "Artist" },
            { key: "title", label: "Title" },
            { key: "year", label: "Year" },
            { key: "chart", label: "Chart" },
            { key: "links", label: "Album links" },
            { key: "cover", label: "Cover" },
            { key: "cands", label: "Candidates" },
            { key: "category", label: "Category" },
            { key: "conf", label: "Confidence" },
            { key: "detail", label: "", align: "right" },
          ]}
          rows={filtered.map((item) => ({
            id: item.rvtr,
            tone: toneForConfidence(item.topConfidence),
            cells: {
              rvtr: (
                <OpsInlineLink href={`/track/${item.rvtr}`}>{item.rvtr}</OpsInlineLink>
              ),
              artist: item.artistName || "—",
              title: <strong>{item.title || "—"}</strong>,
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
              detail: (
                <button
                  type="button"
                  className="ops-btn ops-btn--info"
                  disabled={loadingRvtr === item.rvtr}
                  onClick={() => toggleExpand(item.rvtr)}
                >
                  {loadingRvtr === item.rvtr
                    ? "…"
                    : expandedRvtr === item.rvtr
                      ? "Hide"
                      : "Candidates"}
                </button>
              ),
            },
          }))}
        />
      </section>

      {filtered
        .filter((item) => expandedRvtr === item.rvtr)
        .map((item) => {
          const detail = rowDetails[item.rvtr] ?? item;
          return (
            <section key={detail.rvtr} className="ops-panel ops-panel--nested">
              <header className="ops-panel__header">
                <h2 className="ops-panel__title">
                  {detail.rvtr} · {detail.title}
                </h2>
                <OpsPill tone="info">{detail.candidateCount} candidates</OpsPill>
              </header>
              {loadingRvtr === detail.rvtr ? (
                <p className="ops-dim">Loading candidate audit…</p>
              ) : null}
              {detail.topCandidateReasons.length > 0 ? (
                <p className="ops-dim">
                  Top match: <strong>{detail.topCandidateTitle}</strong> —{" "}
                  {detail.topCandidateReasons.join(" · ")}
                </p>
              ) : null}
              <ul className="ops-dim" style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
                {detail.diagnosis.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {detail.candidates.length === 0 && loadingRvtr !== detail.rvtr ? (
                <p className="ops-empty">
                  No album candidates loaded — expand after ingest review or check graph coverage.
                </p>
              ) : null}
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
                      reasons: c.reasons.join(" · "),
                    },
                  }))}
                />
              ) : null}
            </section>
          );
        })}
    </div>
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
