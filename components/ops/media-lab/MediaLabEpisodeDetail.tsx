"use client";

import { useEffect, useState } from "react";

import type { EpisodeBrowserRow } from "@/lib/ops/media-lab/performance-browser/episodes";

type Props = {
  episodeId: string;
  collection: string;
  selectedPerformanceId?: string;
  onSelectPerformance: (performanceId: string) => void;
};

export function MediaLabEpisodeDetail(props: Props) {
  const [episode, setEpisode] = useState<EpisodeBrowserRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const col = props.collection === "all" ? "midnight_special" : props.collection;
    void fetch(`/api/ops/media-lab/library/episodes?collection=${encodeURIComponent(col)}`)
      .then((r) => r.json())
      .then((data: { episodes?: EpisodeBrowserRow[] }) => {
        setEpisode(data.episodes?.find((e) => e.episode_id === props.episodeId) ?? null);
      })
      .finally(() => setLoading(false));
  }, [props.collection, props.episodeId]);

  if (loading) return <p className="ops-dim">Loading episode…</p>;
  if (!episode) return <p className="mc-notice mc-notice--error">Episode not found.</p>;

  return (
    <section className="ml-workspace__episode-detail">
      <h2 className="ml-workspace__main-title">{episode.episode_title}</h2>
      <p className="ops-dim">
        <code>{episode.episode_id}</code> · {episode.year ?? "—"} · {episode.air_date ?? "—"}
      </p>
      <div className="mc-storage-row" style={{ marginBottom: 16 }}>
        <span>
          Performances: <strong>{episode.performance_count}</strong>
        </span>
        <span>
          Accepted: <strong>{episode.accepted_count}</strong>
        </span>
        <span>
          Review: <strong>{episode.review_count}</strong>
        </span>
        <span>
          Exported: <strong>{episode.exported_count}</strong>
        </span>
      </div>
      <ul className="ml-workspace__perf-pick-list">
        {episode.performances.map((p) => (
          <li key={p.performance_id}>
            <button
              type="button"
              className={`ml-workspace__list-item ${props.selectedPerformanceId === p.performance_id ? "ml-workspace__list-item--active" : ""}`}
              onClick={() => props.onSelectPerformance(p.performance_id)}
            >
              <span className="ml-workspace__list-primary">{p.artist}</span>
              {p.title ? <span className="ops-dim"> — {p.title}</span> : null}
              <span className="ml-workspace__list-meta">
                {p.classification} · {p.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
