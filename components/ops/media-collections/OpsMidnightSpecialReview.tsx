"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  MsCandidateManifest,
  MsEpisodeAnalysis,
  MsPerformanceCandidate,
  MsPerformanceRecord,
} from "@/lib/ops/media-collections/midnight-special/types";
import type { StructuredCollectionMode } from "@/lib/ops/media-collections/midnight-special/structured-mode";

type Payload = {
  ok: boolean;
  analysis?: MsEpisodeAnalysis;
  manifest?: MsCandidateManifest;
  structured_mode?: StructuredCollectionMode;
  error?: string;
};

type QueuePayload = {
  ok: boolean;
  performances?: MsPerformanceRecord[];
  count?: number;
  error?: string;
};

type Props = {
  initialEpisodeId: string;
  initialMode: "episode" | "queue";
};

function confidenceTone(c: MsPerformanceCandidate["confidence"]): string {
  if (c === "exact") return "ok";
  if (c === "high") return "info";
  if (c === "medium") return "warn";
  return "bad";
}

function perfStart(p: MsPerformanceRecord | MsPerformanceCandidate): number {
  return "start_seconds" in p ? p.start_seconds : p.start_sec;
}

function perfEnd(p: MsPerformanceRecord | MsPerformanceCandidate): number {
  return "end_seconds" in p ? p.end_seconds : p.end_sec;
}

function perfId(p: MsPerformanceRecord | MsPerformanceCandidate): string {
  return "performance_id" in p ? p.performance_id : p.id;
}

function perfStatusLabel(p: MsPerformanceRecord | MsPerformanceCandidate): string {
  return "status" in p ? p.status : p.review_status;
}

export default function OpsMidnightSpecialReview({ initialEpisodeId, initialMode }: Props) {
  const [mode, setMode] = useState<"episode" | "queue">(initialMode);
  const [episodeId, setEpisodeId] = useState(initialEpisodeId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MsEpisodeAnalysis | null>(null);
  const [manifest, setManifest] = useState<MsCandidateManifest | null>(null);
  const [queue, setQueue] = useState<MsPerformanceRecord[]>([]);
  const [structured, setStructured] = useState<StructuredCollectionMode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const reviewOnly = mode === "queue";

  const episodePerformances = useMemo(() => {
    if (!manifest) return [];
    if (!reviewOnly) return manifest.performances;
    return manifest.performances.filter(
      (p) => p.review_status === "pending" || p.review_status === "adjusted",
    );
  }, [manifest, reviewOnly]);

  const selectedEpisodePerf = useMemo(
    () => episodePerformances.find((p) => p.id === selectedId) ?? null,
    [episodePerformances, selectedId],
  );

  const selectedQueuePerf = useMemo(
    () => queue.find((p) => p.performance_id === selectedId) ?? null,
    [queue, selectedId],
  );

  const selected = mode === "queue" ? selectedQueuePerf : selectedEpisodePerf;
  const activeEpisodeId =
    mode === "queue" && selectedQueuePerf ? selectedQueuePerf.episode_id : episodeId;

  const loadEpisode = useCallback(async (id: string, regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const q = regenerate ? "&regenerate=1" : "";
      const res = await fetch(
        `/api/ops/media-collections/midnight-special/candidates?episode=${encodeURIComponent(id)}${q}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as Payload;
      if (!res.ok || !data.ok || !data.manifest) {
        setError(data.error ?? "load_failed");
        return;
      }
      setAnalysis(data.analysis ?? null);
      setManifest(data.manifest);
      setStructured(data.structured_mode ?? null);
      const rows = data.manifest.performances;
      setSelectedId(rows[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/ops/media-collections/midnight-special/performances/queue?status=review",
        { cache: "no-store" },
      );
      const data = (await res.json()) as QueuePayload;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "queue_failed");
        return;
      }
      setQueue(data.performances ?? []);
      setSelectedId(data.performances?.[0]?.performance_id ?? null);
      setManifest(null);
      setAnalysis(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "queue_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (mode === "queue") void loadQueue();
    else void loadEpisode(episodeId);
  }, [mode, episodeId, loadEpisode, loadQueue]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !selected) return;
    const start = perfStart(selected);
    const onReady = () => {
      v.currentTime = start;
    };
    v.addEventListener("loadedmetadata", onReady);
    return () => v.removeEventListener("loadedmetadata", onReady);
  }, [selected, activeEpisodeId]);

  async function reviewAction(
    action: "accept" | "reject" | "adjust" | "pending",
    patch?: Partial<MsPerformanceCandidate>,
  ) {
    if (!selected) return;
    const perfId =
      "performance_id" in selected ? selected.performance_id : (selected as MsPerformanceCandidate).id;
    const epId =
      "episode_id" in selected ? selected.episode_id : manifest?.episode_id ?? episodeId;

    setBusy(true);
    setNotice(null);
    try {
      const startSec = patch?.start_sec ?? perfStart(selected);
      const endSec = patch?.end_sec ?? perfEnd(selected);

      const res = await fetch("/api/ops/media-collections/midnight-special/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: epId,
          performance_id: perfId,
          action,
          artist: patch?.artist,
          song: patch?.song,
          start_sec: action === "adjust" ? Math.max(0, startSec - 2) : patch?.start_sec,
          end_sec: action === "adjust" ? endSec + 2 : patch?.end_sec,
        }),
      });
      const data = (await res.json()) as { ok: boolean; performance?: MsPerformanceCandidate };
      if (!res.ok || !data.ok || !data.performance) {
        setError("review_failed");
        return;
      }
      if (mode === "queue") {
        await loadQueue();
        setSelectedId(data.performance.id);
      } else if (manifest) {
        setManifest({
          ...manifest,
          performances: manifest.performances.map((p) =>
            p.id === data.performance!.id ? data.performance! : p,
          ),
        });
      }
      setNotice(`${action} → ${data.performance.artist} — ${data.performance.song}`);
    } finally {
      setBusy(false);
    }
  }

  function previewSelected() {
    const v = videoRef.current;
    if (!v || !selected) return;
    const start = perfStart(selected);
    const end = perfEnd(selected);
    v.currentTime = start;
    void v.play().catch(() => undefined);
    const stopAt = () => {
      if (v.currentTime >= end - 0.25) {
        v.pause();
        v.removeEventListener("timeupdate", stopAt);
      }
    };
    v.addEventListener("timeupdate", stopAt);
  }

  if (loading) {
    return <p className="ops-dim">Loading performances…</p>;
  }

  if (error && !manifest && mode === "episode" && queue.length === 0) {
    return <p className="mc-notice mc-notice--error">{error}</p>;
  }

  const queueRows = queue;
  const tableRows =
    mode === "queue"
      ? queueRows
      : episodePerformances;

  return (
    <section className="ms-review">
      <div className="mc-actions" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`ops-btn ${mode === "queue" ? "ops-btn--warn" : ""}`}
          onClick={() => setMode("queue")}
        >
          Review Queue ({queue.length || "…"})
        </button>
        <button
          type="button"
          className={`ops-btn ${mode === "episode" ? "ops-btn--warn" : ""}`}
          onClick={() => setMode("episode")}
        >
          Episode Review
        </button>
        <Link className="ops-btn ops-btn--link" href="/ops/media-collections/midnight-special">
          ← Dashboard
        </Link>
      </div>

      {mode === "episode" ? (
        <div className="mc-meta-panel">
          <dl>
            <dt>Episode</dt>
            <dd>
              <strong>{manifest?.episode_title}</strong> · <code>{episodeId}</code>
            </dd>
            <dt>Candidates</dt>
            <dd>
              {manifest?.stats.performance_count} performances · automation{" "}
              <strong>{manifest?.stats.automation_rate_pct}%</strong>
            </dd>
            {analysis ? (
              <>
                <dt>Chapters</dt>
                <dd>
                  yt-dlp {analysis.ytdlp_chapter_count} · aligned{" "}
                  {analysis.chapters_aligned ? "yes" : "no"}
                </dd>
              </>
            ) : null}
          </dl>
          <div className="mc-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="ops-btn"
              disabled={busy}
              onClick={() => void loadEpisode(episodeId, true)}
            >
              Regenerate (preserves locked)
            </button>
            {structured ? (
              <a className="ops-btn ops-btn--link" href={structured.media_lab_href}>
                Media Lab
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="ops-banner">
          <strong>Needs Review</strong> — {queueRows.length} performances across episodes (non-exact
          or unresolved).
        </p>
      )}

      {notice ? <p className="mc-notice">{notice}</p> : null}
      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}

      {selected && activeEpisodeId ? (
        <div className="ms-review__layout">
          <div className="ms-review__video">
            <video
              ref={videoRef}
              key={activeEpisodeId}
              className="ms-review__player"
              controls
              playsInline
              src={`/api/ops/media-collections/midnight-special/video?episode=${encodeURIComponent(activeEpisodeId)}`}
            />
          </div>

          <div className="ms-review__table-wrap">
            <table className="ops-table mc-episode-table">
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Song</th>
                  {mode === "queue" ? <th>Episode</th> : null}
                  {mode === "queue" ? <th>Air date</th> : null}
                  <th>Start</th>
                  <th>End</th>
                  <th>Conf.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mode === "queue"
                  ? queueRows.map((p) => (
                      <tr
                        key={p.performance_id}
                        className={p.performance_id === selectedId ? "ms-review__row--active" : ""}
                        onClick={() => setSelectedId(p.performance_id)}
                      >
                        <td>{p.artist}</td>
                        <td>{p.song || "—"}</td>
                        <td className="ops-dim">{p.episode_id}</td>
                        <td>{p.air_date ?? "—"}</td>
                        <td>{p.start_timecode}</td>
                        <td>{p.end_timecode}</td>
                        <td>
                          <span className={`ops-pill ops-pill--${confidenceTone(p.confidence)}`}>
                            {p.confidence}
                          </span>
                        </td>
                        <td>{p.status}</td>
                      </tr>
                    ))
                  : (tableRows as MsPerformanceCandidate[]).map((p) => (
                      <tr
                        key={p.id}
                        className={p.id === selectedId ? "ms-review__row--active" : ""}
                        onClick={() => setSelectedId(p.id)}
                      >
                        <td>{p.artist}</td>
                        <td>{p.song || "—"}</td>
                        <td>{p.start_timecode}</td>
                        <td>{p.end_timecode}</td>
                        <td>
                          <span className={`ops-pill ops-pill--${confidenceTone(p.confidence)}`}>
                            {p.confidence}
                          </span>
                        </td>
                        <td>{perfStatusLabel(p)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {mode === "queue" && queueRows.length === 0 ? (
              <p className="ops-dim" style={{ marginTop: 12 }}>
                Review queue empty — all exact matches accepted or nothing generated yet.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="ms-review__actions mc-actions">
          <button type="button" className="ops-btn" disabled={busy} onClick={previewSelected}>
            Preview
          </button>
          <button
            type="button"
            className="ops-btn"
            disabled={busy}
            onClick={() => void reviewAction("accept")}
          >
            Accept
          </button>
          <button
            type="button"
            className="ops-btn"
            disabled={busy}
            onClick={() => void reviewAction("adjust")}
          >
            Adjust (±2s)
          </button>
          <button
            type="button"
            className="ops-btn"
            disabled={busy}
            onClick={() => void reviewAction("reject")}
          >
            Reject
          </button>
        </div>
      ) : null}

      {mode === "episode" ? (
        <p className="ops-dim" style={{ marginTop: 12 }}>
          Episode selector:{" "}
          <input
            className="ops-input"
            value={episodeId}
            onChange={(e) => setEpisodeId(e.target.value.trim())}
            style={{ maxWidth: 180 }}
          />
        </p>
      ) : null}
    </section>
  );
}
