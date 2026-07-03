"use client";

import { useEffect, useState } from "react";

import type { EpisodeBrowserRow } from "@/lib/ops/media-lab/performance-browser/episode-types";

type Props = {
  episodeId: string;
  collection: string;
  selectedPerformanceId?: string;
  onSelectPerformance: (performanceId: string) => void;
};

function formatDuration(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MediaLabEpisodeDetail(props: Props) {
  const [episode, setEpisode] = useState<EpisodeBrowserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const col = props.collection === "all" ? "midnight_special" : props.collection;
    const params = new URLSearchParams({
      collection: col,
      episode: props.episodeId,
    });
    void fetch(`/api/ops/media-lab/library/episodes?${params}`)
      .then(async (r) => {
        const data = (await r.json()) as { ok?: boolean; episode?: EpisodeBrowserRow; error?: string };
        if (!r.ok || !data.ok || !data.episode) {
          throw new Error(data.error ?? "episode_failed");
        }
        setEpisode(data.episode);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "episode_failed");
        setEpisode(null);
      })
      .finally(() => setLoading(false));
  }, [props.collection, props.episodeId]);

  async function revealFolder(path?: string) {
    if (!episode) return;
    await fetch("/api/ops/media-lab/library/episodes/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episode_id: episode.episode_id,
        collection: episode.collection_id,
        path,
      }),
    });
  }

  function openSourceVideo() {
    if (!episode) return;
    window.open(
      `/api/ops/media-collections/midnight-special/video?episode=${encodeURIComponent(episode.episode_id)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (loading) return <p className="ops-dim">Loading episode…</p>;
  if (error || !episode) {
    return <p className="mc-notice mc-notice--error">{error ?? "Episode not found."}</p>;
  }

  return (
    <section className="ml-episode-detail">
      <header className="ml-episode-detail__header">
        <h2 className="ml-workspace__main-title">{episode.episode_title}</h2>
        {episode.episode_number ? (
          <p className="ml-episode-detail__kicker">Episode {episode.episode_number}</p>
        ) : null}
      </header>

      <dl className="ml-workspace__meta-dl ml-episode-detail__meta">
        <dt>Collection</dt>
        <dd>{episode.collection_title}</dd>
        <dt>Air date</dt>
        <dd>{episode.air_date ?? "—"}</dd>
        <dt>Year</dt>
        <dd>{episode.year ?? "—"}</dd>
        <dt>Episode ID</dt>
        <dd>
          <code>{episode.episode_id}</code>
        </dd>
        <dt>Duration</dt>
        <dd>{formatDuration(episode.duration_sec)}</dd>
        <dt>Download</dt>
        <dd>
          <span
            className={`ml-episode-detail__status ml-episode-detail__status--${episode.download_status}`}
          >
            {episode.download_status}
          </span>
        </dd>
        <dt>Performances</dt>
        <dd>{episode.performance_count}</dd>
        <dt>Accepted</dt>
        <dd>{episode.accepted_count}</dd>
        <dt>Review</dt>
        <dd>{episode.review_count}</dd>
        <dt>Exported</dt>
        <dd>{episode.exported_count}</dd>
      </dl>

      <div className="mc-actions ml-episode-detail__actions">
        <button
          type="button"
          className="ops-btn ops-btn--info"
          disabled={episode.download_status !== "downloaded"}
          onClick={openSourceVideo}
        >
          Open Source Video
        </button>
        <button
          type="button"
          className="ops-btn"
          disabled={!episode.video_path}
          onClick={() => void revealFolder()}
        >
          Reveal Folder
        </button>
      </div>

      <h3 className="ml-episode-detail__perf-title">Performances</h3>
      <ul className="ml-episode-detail__perf-list">
        {episode.performances.map((p) => (
          <li key={p.performance_id}>
            <div
              className={`ml-episode-detail__perf ${props.selectedPerformanceId === p.performance_id ? "ml-episode-detail__perf--active" : ""}`}
            >
              <div className="ml-episode-detail__perf-main">
                <span className="ml-episode-detail__perf-artist">{p.artist || "—"}</span>
                {p.title ? (
                  <span className="ml-episode-detail__perf-title-text"> — {p.title}</span>
                ) : null}
              </div>
              <div className="ml-episode-detail__perf-meta">
                <span>{p.classification}</span>
                <span>{p.status}</span>
                <span>
                  {p.start_timecode} → {p.end_timecode}
                </span>
                <span>{p.export_status}</span>
              </div>
              <button
                type="button"
                className="ops-btn ops-btn--sm ops-btn--info ml-episode-detail__perf-open"
                onClick={() => props.onSelectPerformance(p.performance_id)}
              >
                Open in Editor
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
