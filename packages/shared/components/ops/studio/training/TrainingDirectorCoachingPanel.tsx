"use client";

import { useState } from "react";

import type {
  DirectorAbComparison,
  DirectorTrainingPayload,
  ExhibitCoachingVerdict,
  FrameRankMetadata,
} from "@/lib/ops/studio/director/coaching/types";
import { IDENTIFIED_COACHING_REASONS } from "@/lib/ops/studio/director/coaching/types";

type Props = {
  rvtr: string;
  initial: DirectorTrainingPayload;
  onSaved?: () => void;
};

const VERDICTS: Array<{ id: ExhibitCoachingVerdict; label: string; symbol: string }> = [
  { id: "perfect", label: "Perfect", symbol: "✓" },
  { id: "good", label: "Good but could improve", symbol: "▲" },
  { id: "wrong", label: "Wrong choice", symbol: "✕" },
];

function FrameMeta({ frame }: { frame: FrameRankMetadata | null }) {
  if (!frame) return <p className="rs-dir-coach__empty">No frame assigned</p>;

  return (
    <dl className="rs-dir-coach__frame-meta">
      <div><dt>Category</dt><dd>{frame.category}</dd></div>
      <div><dt>Quality</dt><dd>{frame.quality}%</dd></div>
      <div><dt>Sharpness</dt><dd>{frame.sharpness ?? "—"}</dd></div>
      <div><dt>Motion</dt><dd>{frame.motion}</dd></div>
      <div><dt>Brightness</dt><dd>{frame.brightness ?? "—"}</dd></div>
      <div><dt>Uniqueness</dt><dd>{frame.uniqueness}%</dd></div>
      <div><dt>Neighbor gap</dt><dd>{frame.neighborDistanceSec != null ? `${frame.neighborDistanceSec.toFixed(1)}s` : "—"}</dd></div>
      <div><dt>Diversity</dt><dd>{frame.diversityScore}%</dd></div>
      <div className="rs-dir-coach__frame-reason"><dt>Why</dt><dd>{frame.selectionReason}</dd></div>
    </dl>
  );
}

function AbCompare({ comparison }: { comparison: DirectorAbComparison | null }) {
  if (!comparison?.previous) {
    return <p className="rs-dir-coach__empty">No previous plan archived yet — re-run Director to enable A/B.</p>;
  }

  const rows = ["cover", "iconic_moment", "performance"] as const;
  const labels: Record<string, string> = {
    cover: "Opening",
    iconic_moment: "Iconic frame",
    performance: "Ending",
  };

  return (
    <div className="rs-dir-coach__ab">
      <div className="rs-dir-coach__ab-col">
        <h4>Current plan</h4>
        <p className="rs-dir-coach__ab-meta">{new Date(comparison.current.generatedAt).toLocaleString()}</p>
        <ul>
          {rows.map((key) => {
            const scene = comparison.current.scenes.find((s) => s.exhibitId === key);
            return (
              <li key={`ab-current-${key}`}>
                <strong>{labels[key]}</strong>: {scene?.headline || scene?.label || "—"}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rs-dir-coach__ab-col">
        <h4>Previous plan</h4>
        <p className="rs-dir-coach__ab-meta">{new Date(comparison.previous.savedAt).toLocaleString()}</p>
        <ul>
          {rows.map((key) => {
            const scene = comparison.previous!.scenes.find((s) => s.exhibitId === key);
            return (
              <li key={`ab-previous-${key}`}>
                <strong>{labels[key]}</strong>: {scene?.headline || scene?.label || "—"}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function TrainingDirectorCoachingPanel({ rvtr, initial, onSaved }: Props) {
  const [payload, setPayload] = useState(initial);
  const [selectedReasons, setSelectedReasons] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function toggleReason(exhibitId: string, reason: string) {
    setSelectedReasons((prev) => {
      const current = prev[exhibitId] ?? [];
      const next = current.includes(reason)
        ? current.filter((r) => r !== reason)
        : [...current, reason];
      return { ...prev, [exhibitId]: next };
    });
  }

  async function submit(exhibitId: string, verdict: ExhibitCoachingVerdict, frame: FrameRankMetadata | null) {
    setBusy(exhibitId);
    setMessage(null);
    try {
      const res = await fetch(`/api/ops/studio/director/coaching/${rvtr}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exhibitId,
          verdict,
          reasons: selectedReasons[exhibitId] ?? [],
          note: notes[exhibitId]?.trim() || null,
          frameAssetId: frame?.assetId ?? null,
          frameCategory: frame?.category ?? null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "save_failed");

      const refresh = await fetch(`/api/ops/studio/director/coaching/${rvtr}`);
      const refreshed = (await refresh.json()) as { ok?: boolean; payload?: DirectorTrainingPayload };
      if (refreshed.payload) setPayload(refreshed.payload);
      setMessage(`Saved coaching for ${exhibitId.replace(/_/g, " ")}`);
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save coaching");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rs-studio-panel rs-dir-coach">
      <header className="rs-dir-coach__head">
        <h2 className="rs-dir-coach__title">Director Coaching</h2>
        <p className="rs-dir-coach__lead">
          Teach judgment per exhibit — coaching improves future frame selection across all songs.
        </p>
      </header>

      <section className="rs-dir-coach__rules">
        <h3 className="rs-dir-coach__section-title">Learned from decisions</h3>
        {payload.analytics.categoryPreference.length > 0 ? (
          <ul className="rs-dir-coach__rules-list">
            {payload.analytics.categoryPreference.map((row) => (
              <li key={row.id}>
                <strong>{row.category}</strong>
                <span>
                  preferred {row.accepted}× · rejected {row.rejected}×
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rs-dir-coach__empty">Coaching records will build frame preference rules over time.</p>
        )}
      </section>

      <section className="rs-dir-coach__ab-panel">
        <h3 className="rs-dir-coach__section-title">A/B — Current vs Previous</h3>
        <AbCompare comparison={payload.abComparison} />
      </section>

      <div className="rs-dir-coach__exhibits">
        {payload.exhibits.map((exhibit) => (
          <article key={exhibit.exhibitId} className="rs-studio-elevated-card rs-dir-coach__exhibit">
            <header>
              <h3>{exhibit.label}</h3>
              {exhibit.coaching ? (
                <p className="rs-dir-coach__last">
                  Last: {exhibit.coaching.verdict} · {new Date(exhibit.coaching.coachedAt).toLocaleString()}
                </p>
              ) : null}
            </header>

            {exhibit.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={exhibit.coverUrl} alt="" className="rs-dir-coach__thumb" />
            ) : null}

            <FrameMeta frame={exhibit.frame} />

            <div className="rs-dir-coach__reasons">
              <p className="rs-dir-coach__reasons-label">Structured coaching</p>
              <div className="rs-dir-coach__reason-chips">
                {IDENTIFIED_COACHING_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    className={
                      (selectedReasons[exhibit.exhibitId] ?? []).includes(reason.label)
                        ? "rs-dir-coach__chip rs-dir-coach__chip--on"
                        : "rs-dir-coach__chip"
                    }
                    onClick={() => toggleReason(exhibit.exhibitId, reason.label)}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="rs-dir-coach__note"
              rows={2}
              placeholder="Optional note"
              value={notes[exhibit.exhibitId] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [exhibit.exhibitId]: e.target.value }))}
            />

            <div className="rs-dir-coach__verdicts">
              {VERDICTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={busy === exhibit.exhibitId}
                  className={`rs-dir-coach__verdict rs-dir-coach__verdict--${v.id}`}
                  onClick={() => submit(exhibit.exhibitId, v.id, exhibit.frame)}
                >
                  <span aria-hidden>{v.symbol}</span> {v.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {message ? <p className="rs-dir-coach__msg">{message}</p> : null}
    </section>
  );
}
