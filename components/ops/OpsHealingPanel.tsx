"use client";

import { useMemo, useState } from "react";

import { OpsInlineLink, OpsPill, OpsTable } from "@/components/ops/OpsTable";
import {
  HEALING_DEGRADATION_LABELS,
  type HealingDegradationFlag,
} from "@/lib/healing/degradation";
import type { HealingDegradedQueue, HealingQueueRow } from "@/lib/healing/load-degraded-queue";

type FilterKey = "all" | HealingDegradationFlag;

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
  if (status === "ok") return <OpsPill tone="ok">cover ok</OpsPill>;
  if (status === "missing") return <OpsPill tone="warn">no cover</OpsPill>;
  return <OpsPill tone="bad">no album</OpsPill>;
}

function statePill(state: HealingQueueRow["healingState"]) {
  const map = {
    degraded: ["warn", "degraded"] as const,
    linked: ["ok", "linked"] as const,
    no_candidates: ["bad", "no candidates"] as const,
    candidates_ready: ["info", "review"] as const,
  };
  const [tone, label] = map[state];
  return <OpsPill tone={tone}>{label}</OpsPill>;
}

function flagPills(flags: HealingDegradationFlag[]) {
  return (
    <span className="ops-healing__flags">
      {flags.map((f) => (
        <OpsPill key={f} tone="info">
          {HEALING_DEGRADATION_LABELS[f]}
        </OpsPill>
      ))}
    </span>
  );
}

export function OpsHealingPanel(props: { queue: HealingDegradedQueue }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedRvtr, setExpandedRvtr] = useState<string | null>(null);
  const [rowDetails, setRowDetails] = useState<Record<string, HealingQueueRow>>({});
  const [loadingRvtr, setLoadingRvtr] = useState<string | null>(null);

  const mergedRows = useMemo(
    () =>
      props.queue.rows.map((row) => rowDetails[row.rvtr] ?? row),
    [props.queue.rows, rowDetails],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return mergedRows;
    return mergedRows.filter((r) => r.degradationFlags.includes(filter));
  }, [filter, mergedRows]);

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
          <h2 className="ops-panel__title">Archive degradation</h2>
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
          Review queue: <strong>{props.queue.summary.queueSize}</strong> tracks · top rows
          pre-scored · expand for full candidate audit · no auto-apply
        </p>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Filter by degradation</h2>
        </header>
        <div className="ops-healing__filters">
          <FilterButton
            active={filter === "all"}
            label={`All (${props.queue.rows.length})`}
            onClick={() => setFilter("all")}
          />
          {(Object.keys(HEALING_DEGRADATION_LABELS) as HealingDegradationFlag[]).map((key) => (
            <FilterButton
              key={key}
              active={filter === key}
              label={`${HEALING_DEGRADATION_LABELS[key]} (${counts[key].toLocaleString()})`}
              onClick={() => setFilter(key)}
            />
          ))}
        </div>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Degraded tracks ({filtered.length})</h2>
        </header>
        <OpsTable
          empty="No tracks match this filter."
          columns={[
            { key: "rvtr", label: "RVTR" },
            { key: "track", label: "Track" },
            { key: "year", label: "Year" },
            { key: "chart", label: "Chart" },
            { key: "links", label: "Album links" },
            { key: "cover", label: "Cover" },
            { key: "conf", label: "Top conf." },
            { key: "state", label: "Healing" },
            { key: "detail", label: "", align: "right" },
          ]}
          rows={filtered.map((item) => ({
            id: item.rvtr,
            tone: toneForConfidence(item.topConfidence),
            className: expandedRvtr === item.rvtr ? "ops-table__row--open" : undefined,
            cells: {
              rvtr: (
                <OpsInlineLink href={`/track/${item.rvtr}`}>{item.rvtr}</OpsInlineLink>
              ),
              track: (
                <>
                  <strong>{item.title}</strong>
                  <br />
                  <span className="ops-dim">{item.artistName}</span>
                  <br />
                  {flagPills(item.degradationFlags)}
                </>
              ),
              year: item.releaseYear ?? "—",
              chart: item.chartStatus,
              links: String(item.albumLinkCount),
              cover: coverPill(item.coverStatus),
              conf: (
                <OpsPill tone={toneForConfidence(item.topConfidence)}>
                  {confidenceLabel(item.topConfidence)}
                </OpsPill>
              ),
              state: statePill(item.healingState),
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
            <ul className="ops-dim" style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
              {detail.diagnosis.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {detail.candidates.length === 0 && loadingRvtr !== detail.rvtr ? (
              <p className="ops-empty">No album candidates — likely needs album ingest.</p>
            ) : null}
            {detail.candidates.length > 0 ? (
              <OpsTable
                columns={[
                  { key: "conf", label: "Conf." },
                  { key: "album", label: "Album candidate" },
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
