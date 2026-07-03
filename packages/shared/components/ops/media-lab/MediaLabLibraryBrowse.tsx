"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  episodeListLabel,
  type EpisodeBrowserRow,
} from "@/lib/ops/media-lab/performance-browser/episode-utils";
import type { ExportedClipRow } from "@/lib/ops/media-lab/performance-browser/exported";
import type { PerformanceBrowserResult, PerformanceBrowserRow } from "@/lib/ops/media-lab/performance-browser/types";
import type { EpisodeBrowseView, MediaLabLibrarySection } from "@/lib/ops/media-lab/workspace/urls";

import { MediaLabEpisodeTree } from "./MediaLabEpisodeTree";

type Props = {
  library: MediaLabLibrarySection;
  collection: string;
  episodeView: EpisodeBrowseView;
  selectedEpisodeId?: string;
  selectedPerformanceId?: string;
  filters: {
    q: string;
    year: string;
    status: string;
    classification: string;
  };
  onFiltersChange: (patch: Partial<Props["filters"]> & { view?: EpisodeBrowseView }) => void;
  onSelectEpisode: (episodeId: string) => void;
  onSelectPerformance: (episodeId: string, performanceId: string) => void;
};

const CLASSIFICATIONS = ["all", "Performance", "Comedy", "Interview", "Intro", "Movie Clip", "Commercial", "Unknown"];
const STATUSES = ["all", "candidate", "review", "accepted", "rejected", "exported"];

function RecentList(props: {
  items: PerformanceBrowserRow[];
  selectedPerformanceId?: string;
  onSelect: (ep: string, perf: string) => void;
}) {
  if (!props.items.length) {
    return <p className="ops-dim ml-workspace__empty">No recent performances.</p>;
  }
  return (
    <ul className="ml-workspace__list">
      {props.items.map((row) => (
        <li key={row.performance_id}>
          <button
            type="button"
            className={`ml-workspace__list-item ${props.selectedPerformanceId === row.performance_id ? "ml-workspace__list-item--active" : ""}`}
            onClick={() => props.onSelect(row.episode_id, row.performance_id)}
          >
            <span className="ml-workspace__list-primary">{row.artist}</span>
            {row.title ? <span className="ops-dim"> — {row.title}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MediaLabLibraryBrowse(props: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performances, setPerformances] = useState<PerformanceBrowserResult | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeBrowserRow[]>([]);
  const [exported, setExported] = useState<ExportedClipRow[]>([]);
  const [recent, setRecent] = useState<PerformanceBrowserRow[]>([]);

  const perfParams = useMemo(() => {
    const search = new URLSearchParams();
    if (props.filters.q.trim()) search.set("q", props.filters.q.trim());
    if (props.collection !== "all") search.set("collection", props.collection);
    if (props.filters.year !== "all") search.set("year", props.filters.year);
    if (props.filters.status !== "all") search.set("status", props.filters.status);
    if (props.filters.classification !== "all") search.set("classification", props.filters.classification);
    search.set("limit", "500");
    return search.toString();
  }, [props.collection, props.filters]);

  const episodeParams = useMemo(() => {
    const search = new URLSearchParams();
    const col = props.collection === "all" ? "midnight_special" : props.collection;
    search.set("collection", col);
    if (props.filters.q.trim()) search.set("q", props.filters.q.trim());
    return search.toString();
  }, [props.collection, props.filters.q]);

  const load = useCallback(async () => {
    if (props.library === "imported" || props.library === "harvest") return;
    setLoading(true);
    setError(null);
    try {
      if (props.library === "performances" || props.library === "recent") {
        const res = await fetch(`/api/ops/media-lab/performances/browse?${perfParams}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as PerformanceBrowserResult & { ok: boolean };
        if (!res.ok || !data.ok) throw new Error("browse_failed");
        setPerformances(data);
        if (props.library === "recent") {
          const raw = localStorage.getItem("media-lab-recent-performances");
          const ids = raw ? (JSON.parse(raw) as string[]) : [];
          const byId = new Map(data.rows.map((r) => [r.performance_id, r]));
          setRecent(ids.map((id) => byId.get(id)).filter(Boolean) as PerformanceBrowserRow[]);
        }
      } else if (props.library === "episodes") {
        const res = await fetch(`/api/ops/media-lab/library/episodes?${episodeParams}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { ok: boolean; episodes?: EpisodeBrowserRow[] };
        if (!res.ok || !data.ok) throw new Error("episodes_failed");
        setEpisodes(data.episodes ?? []);
      } else if (props.library === "exported") {
        const res = await fetch("/api/ops/media-lab/library/exported", { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; clips?: ExportedClipRow[] };
        if (!res.ok || !data.ok) throw new Error("exported_failed");
        setExported(data.clips ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [episodeParams, perfParams, props.library]);

  useEffect(() => {
    const delay = props.filters.q && (props.library === "performances" || props.library === "episodes") ? 250 : 0;
    const t = window.setTimeout(() => void load(), delay);
    return () => window.clearTimeout(t);
  }, [load, props.filters.q, props.library]);

  if (props.library === "imported") {
    return <p className="ops-dim ml-workspace__hint">Import and analyze videos in the main panel →</p>;
  }

  if (props.library === "harvest") {
    return <p className="ops-dim ml-workspace__hint">Harvest library opens in the main panel →</p>;
  }

  const showPerfFilters = props.library === "performances" || props.library === "recent";
  const showEpisodeSearch = props.library === "episodes";
  const collectionTitle =
    episodes[0]?.collection_title ??
    (props.collection === "midnight_special" ? "Midnight Special" : props.collection);

  return (
    <div className="ml-workspace__browse-inner">
      {showPerfFilters ? (
        <>
          <input
            className="ops-input ml-workspace__search"
            type="search"
            placeholder="Search artist, title, episode…"
            value={props.filters.q}
            onChange={(e) => props.onFiltersChange({ q: e.target.value })}
          />
          <div className="ml-workspace__mini-filters">
            <select
              className="ops-input"
              value={props.filters.year}
              onChange={(e) => props.onFiltersChange({ year: e.target.value })}
            >
              <option value="all">All years</option>
              {(performances?.facets.years ?? []).map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="ops-input"
              value={props.filters.status}
              onChange={(e) => props.onFiltersChange({ status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All status" : s}
                </option>
              ))}
            </select>
            <select
              className="ops-input"
              value={props.filters.classification}
              onChange={(e) => props.onFiltersChange({ classification: e.target.value })}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All class" : c}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      {showEpisodeSearch ? (
        <>
          <input
            className="ops-input ml-workspace__search"
            type="search"
            placeholder="Search episode, date, artist, song…"
            value={props.filters.q}
            onChange={(e) => props.onFiltersChange({ q: e.target.value })}
          />
          <div className="ml-workspace__view-toggle">
            <button
              type="button"
              className={`ml-workspace__view-btn ${props.episodeView === "list" ? "ml-workspace__view-btn--active" : ""}`}
              onClick={() => props.onFiltersChange({ view: "list" })}
            >
              List
            </button>
            <button
              type="button"
              className={`ml-workspace__view-btn ${props.episodeView === "tree" ? "ml-workspace__view-btn--active" : ""}`}
              onClick={() => props.onFiltersChange({ view: "tree" })}
            >
              Tree
            </button>
          </div>
        </>
      ) : null}

      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}
      {loading ? <p className="ops-dim">Loading…</p> : null}

      {props.library === "recent" ? (
        <RecentList
          items={recent}
          selectedPerformanceId={props.selectedPerformanceId}
          onSelect={props.onSelectPerformance}
        />
      ) : null}

      {props.library === "performances" ? (
        <ul className="ml-workspace__list">
          {(performances?.rows ?? []).map((row) => (
            <li key={row.performance_id}>
              <button
                type="button"
                className={`ml-workspace__list-item ${props.selectedPerformanceId === row.performance_id ? "ml-workspace__list-item--active" : ""}`}
                onClick={() => props.onSelectPerformance(row.episode_id, row.performance_id)}
              >
                <span className="ml-workspace__list-primary">{row.artist}</span>
                {row.title ? <span className="ops-dim"> — {row.title}</span> : null}
                <span className="ml-workspace__list-meta">
                  {row.year ?? "—"} · {row.classification}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {props.library === "episodes" && props.episodeView === "tree" ? (
        <MediaLabEpisodeTree
          episodes={episodes}
          collectionTitle={collectionTitle}
          selectedEpisodeId={props.selectedEpisodeId}
          onSelectEpisode={props.onSelectEpisode}
        />
      ) : null}

      {props.library === "episodes" && props.episodeView !== "tree" ? (
        <ul className="ml-workspace__list">
          {episodes.map((ep) => (
            <li key={ep.episode_id}>
              <button
                type="button"
                className={`ml-workspace__list-item ${props.selectedEpisodeId === ep.episode_id ? "ml-workspace__list-item--active" : ""}`}
                onClick={() => props.onSelectEpisode(ep.episode_id)}
              >
                <span className="ml-workspace__list-primary">{episodeListLabel(ep)}</span>
                <span className="ml-workspace__list-meta">
                  {ep.collection_title} · {ep.year ?? "—"}
                  {ep.air_date ? ` · ${ep.air_date}` : ""}
                </span>
                <span className="ml-workspace__list-meta">
                  {ep.performance_count} perf · {ep.accepted_count} accepted · {ep.review_count} review ·{" "}
                  {ep.exported_count} exported
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {props.library === "exported" ? (
        <ul className="ml-workspace__list">
          {exported.map((clip) => (
            <li key={clip.performance_id}>
              <button
                type="button"
                className={`ml-workspace__list-item ${props.selectedPerformanceId === clip.performance_id ? "ml-workspace__list-item--active" : ""}`}
                onClick={() => props.onSelectPerformance(clip.episode_id, clip.performance_id)}
              >
                <span className="ml-workspace__list-primary">{clip.artist}</span>
                {clip.title ? <span className="ops-dim"> — {clip.title}</span> : null}
                <span className="ml-workspace__list-meta">
                  {clip.year} · {clip.grouping}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
