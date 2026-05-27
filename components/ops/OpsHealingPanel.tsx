"use client";

import { useState } from "react";

import { OpsInlineLink, OpsPill, OpsTable } from "@/components/ops/OpsTable";
import type {
  HealingReviewItem,
  HealingReviewSet,
} from "@/lib/healing/types";
import type {
  ScoredAlbumLinkCandidate,
  TrackAlbumLinkAudit,
} from "@/lib/track/album-link-recovery/types";

type ScoredCandidate = ScoredAlbumLinkCandidate;

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

export function OpsHealingPanel(props: {
  review: HealingReviewSet;
  writesEnabled: boolean;
}) {
  const [items, setItems] = useState(props.review.items);
  const [message, setMessage] = useState<string | null>(null);
  const [busyRvtr, setBusyRvtr] = useState<string | null>(null);

  async function applyCandidate(item: HealingReviewItem, candidate: ScoredCandidate) {
    if (!props.writesEnabled) {
      setMessage("Writes disabled — set RETROVERSE_HEALING_APPLY=1 locally.");
      return;
    }
    const ok = window.confirm(
      `Apply album link?\n\n${item.rvtr} → album ${candidate.albumId} "${candidate.albumTitle}"\nconfidence ${candidate.confidence}\n\nNo auto-merge. Single INSERT only.`,
    );
    if (!ok) return;

    setBusyRvtr(item.rvtr);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/healing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rvtr: item.rvtr,
          albumId: candidate.albumId,
          position: candidate.trackPosition,
          sequenceTitle: candidate.sequenceTitle ?? item.title,
          confidence: candidate.confidence,
          reasons: candidate.reasons,
          sourceKind: candidate.sourceKind,
          actor: "ops/healing-ui",
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        proposalId?: number;
        catRowId?: number;
        code?: string;
      };
      if (!res.ok || !data.ok) {
        setMessage(data.message || data.code || "Apply failed.");
        return;
      }
      setItems((prev) =>
        prev.map((row) =>
          row.rvtr === item.rvtr
            ? { ...row, reviewStatus: "applied", existingLinkCount: 1, gap: "none" }
            : row,
        ),
      );
      setMessage(
        `Applied ${item.rvtr} → proposal #${data.proposalId}, cat row #${data.catRowId}. Track page revalidated.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyRvtr(null);
    }
  }

  const degraded = items.filter((i) => i.gap === "missing_album_links");

  return (
    <div className="ops-healing">
      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Summary</h2>
        </header>
        <p className="ops-dim">
          Hot 100 missing album links:{" "}
          <strong>
            {props.review.summary.hot100MissingLinks.toLocaleString()} /{" "}
            {props.review.summary.hot100Total.toLocaleString()}
          </strong>{" "}
          ({props.review.summary.pctMissing}%)
        </p>
        <p className="ops-dim">
          Cluster <strong>{props.review.clusterLabel}</strong> · degraded{" "}
          {props.review.summary.degradedCount} / {props.review.summary.clusterSize}
        </p>
        <p className="ops-dim">
          Writes:{" "}
          {props.writesEnabled ? (
            <OpsPill tone="ok">RETROVERSE_HEALING_APPLY=1</OpsPill>
          ) : (
            <OpsPill tone="warn">preview only</OpsPill>
          )}
        </p>
        {message ? <p className="ops-banner">{message}</p> : null}
      </section>

      {props.review.healthyControl ? (
        <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Healthy control</h2>
        </header>
          <ControlRow audit={props.review.healthyControl} />
        </section>
      ) : null}

      <section className="ops-panel">
        <header className="ops-panel__header">
          <h2 className="ops-panel__title">Degraded tracks ({degraded.length})</h2>
        </header>
        <OpsTable
          empty="No degraded tracks in this cluster."
          columns={[
            { key: "rvtr", label: "RVTR" },
            { key: "track", label: "Track" },
            { key: "chart", label: "Chart" },
            { key: "top", label: "Top conf." },
            { key: "gap", label: "Gap" },
          ]}
          rows={degraded.map((item) => ({
            id: item.rvtr,
            tone: toneForConfidence(item.topConfidence),
            cells: {
              rvtr: (
                <OpsInlineLink href={`/track/${item.rvtr}`}>{item.rvtr}</OpsInlineLink>
              ),
              track: (
                <>
                  <strong>{item.title}</strong>
                  <br />
                  <span className="ops-dim">{item.artistName}</span>
                </>
              ),
              chart: `${item.chartWeeks}w · peak ${item.peakHot100 ?? "—"}`,
              top: (
                <OpsPill tone={toneForConfidence(item.topConfidence)}>
                  {confidenceLabel(item.topConfidence)}
                </OpsPill>
              ),
              gap: item.coverGap ? "links + cover" : "links only",
            },
          }))}
        />
      </section>

      {degraded.map((item) => (
        <section key={item.rvtr} className="ops-panel">
          <header className="ops-panel__header">
            <h2 className="ops-panel__title">
              {item.rvtr} · {item.title}
            </h2>
            <OpsPill tone={item.reviewStatus === "applied" ? "ok" : "warn"}>
              {item.reviewStatus}
            </OpsPill>
          </header>
          <ul className="ops-dim" style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
            {item.diagnosis.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {item.candidates.length === 0 ? (
            <p className="ops-empty">No candidates — likely needs album ingest.</p>
          ) : (
            <OpsTable
              columns={[
                { key: "conf", label: "Conf." },
                { key: "album", label: "Album candidate" },
                { key: "reasons", label: "Evidence" },
                { key: "action", label: "Action", align: "right" },
              ]}
              rows={item.candidates.slice(0, 6).map((c) => ({
                id: `${item.rvtr}-${c.albumId}`,
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
                  reasons: c.reasons.join(", "),
                  action: (
                    <button
                      type="button"
                      className="ops-btn ops-btn--warn"
                      disabled={
                        !props.writesEnabled ||
                        item.reviewStatus === "applied" ||
                        busyRvtr === item.rvtr ||
                        c.confidence < 0.45
                      }
                      title={
                        c.confidence < 0.45
                          ? "Below approval threshold (0.45)"
                          : "Human approve + single INSERT"
                      }
                      onClick={() => applyCandidate(item, c)}
                    >
                      {busyRvtr === item.rvtr ? "…" : "Approve apply"}
                    </button>
                  ),
                },
              }))}
            />
          )}
        </section>
      ))}
    </div>
  );
}

function ControlRow(props: { audit: TrackAlbumLinkAudit }) {
  const a = props.audit;
  return (
    <p className="ops-dim">
      <OpsInlineLink href={`/track/${a.rvtr}`}>{a.rvtr}</OpsInlineLink> — {a.title} ·{" "}
      {a.artistName} · links {a.existingLinkCount} · peak {a.peakHot100 ?? "—"}
    </p>
  );
}
