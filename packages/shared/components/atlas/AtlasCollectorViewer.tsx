"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  AtlasCollectorSong,
  AtlasCollectorViewerData,
} from "@/lib/atlas/load-collector-atlas-viewer";

type Props = {
  data: AtlasCollectorViewerData;
};

type AtlasFilterId =
  | "1980"
  | "1990"
  | "2005"
  | "collector_complete"
  | "needs_editor"
  | "published"
  | "has_chart_journey"
  | "missing_cover";

const FILTERS: Array<{ id: AtlasFilterId; label: string; countKey: keyof AtlasCollectorViewerData["counts"] }> = [
  { id: "1980", label: "1980s", countKey: "era1980" },
  { id: "1990", label: "1990s", countKey: "era1990" },
  { id: "2005", label: "2000s", countKey: "era2005" },
  { id: "collector_complete", label: "Collector complete", countKey: "collectorComplete" },
  { id: "needs_editor", label: "Needs editor", countKey: "needsEditor" },
  { id: "published", label: "Published", countKey: "published" },
  { id: "has_chart_journey", label: "Has chart journey", countKey: "hasChartJourney" },
  { id: "missing_cover", label: "Missing cover", countKey: "missingCover" },
];

function matchesFilter(song: AtlasCollectorSong, filter: AtlasFilterId): boolean {
  switch (filter) {
    case "1980":
      return song.era === 1980;
    case "1990":
      return song.era === 1990;
    case "2005":
      return song.era === 2005;
    case "collector_complete":
      return song.collectorStatus === "complete";
    case "needs_editor":
      return song.editorStatus === "none";
    case "published":
      return song.publisherStatus === "published";
    case "has_chart_journey":
      return song.hasChartJourney;
    case "missing_cover":
      return !song.coverUrl;
    default:
      return true;
  }
}

function statusPill(label: string, tone: "ok" | "warn" | "dim" | "info") {
  return <span className={`atlas-lib__pill atlas-lib__pill--${tone}`}>{label}</span>;
}

function collectorPill(status: AtlasCollectorSong["collectorStatus"]) {
  return statusPill(status === "complete" ? "Collector complete" : "Collector partial", status === "complete" ? "ok" : "warn");
}

function editorPill(status: AtlasCollectorSong["editorStatus"]) {
  if (status === "none") return statusPill("Needs editor", "warn");
  if (status === "submitted") return statusPill("Editor submitted", "ok");
  return statusPill("Editor draft", "info");
}

function publisherPill(status: AtlasCollectorSong["publisherStatus"]) {
  if (status === "published") return statusPill("Published", "ok");
  if (status === "evaluated") return statusPill("Publisher evaluated", "info");
  return statusPill("Not published", "dim");
}

const PAGE_SIZE = 150;

function SongRow({ song }: { song: AtlasCollectorSong }) {
  return (
    <article className="atlas-lib__row">
      <div className="atlas-lib__row-art" aria-hidden>
        {song.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.coverUrl} alt="" className="atlas-lib__row-image" />
        ) : (
          <div className="atlas-lib__row-placeholder">♫</div>
        )}
      </div>

      <div className="atlas-lib__row-main">
        <div className="atlas-lib__row-head">
          <div>
            <p className="atlas-lib__row-rvtr">{song.rvtr}</p>
            <p className="atlas-lib__row-artist">{song.artist}</p>
            <h2 className="atlas-lib__row-title">{song.title}</h2>
            <p className="atlas-lib__row-year">
              {song.year ?? "Year unknown"}
              {song.hasChartJourney ? " · Chart journey ready" : " · No chart journey"}
            </p>
          </div>
          <div className="atlas-lib__row-pills">
            {collectorPill(song.collectorStatus)}
            {editorPill(song.editorStatus)}
            {publisherPill(song.publisherStatus)}
          </div>
        </div>

        <dl className="atlas-lib__row-stats">
          <div>
            <dt>Facts</dt>
            <dd>{song.factCount}</dd>
          </div>
          <div>
            <dt>Media</dt>
            <dd>{song.mediaCount}</dd>
          </div>
          <div>
            <dt>Cover</dt>
            <dd>{song.coverUrl ? "Yes" : "Missing"}</dd>
          </div>
        </dl>

        <div className="atlas-lib__row-links">
          <Link href={song.links.collector} className="atlas-lib__link">
            Collector
          </Link>
          <Link href={song.links.editor} className="atlas-lib__link">
            Editor
          </Link>
          <Link href={song.links.chartJourney} className="atlas-lib__link">
            Chart Journey
          </Link>
          {song.links.patron ? (
            <Link href={song.links.patron} className="atlas-lib__link atlas-lib__link--accent">
              Patron
            </Link>
          ) : (
            <span className="atlas-lib__link atlas-lib__link--disabled">Patron</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function AtlasCollectorViewer({ data }: Props) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<AtlasFilterId>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.songs.filter((song) => {
      const matchesQuery =
        !q ||
        song.artist.toLowerCase().includes(q) ||
        song.title.toLowerCase().includes(q) ||
        song.rvtr.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (activeFilters.size === 0) return true;
      for (const filter of activeFilters) {
        if (!matchesFilter(song, filter)) return false;
      }
      return true;
    });
  }, [activeFilters, data.songs, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeFilters]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  function toggleFilter(id: AtlasFilterId) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="atlas-lib">
      <header className="atlas-lib__hero">
        <p className="atlas-lib__eyebrow">Atlas Encyclopedia</p>
        <h1 className="atlas-lib__title">Collected Songs</h1>
        <p className="atlas-lib__lead">
          Browse Collector output, pipeline status, and quick links — no Editor, Director, or Publisher required.
        </p>
        <dl className="atlas-lib__counts">
          <div>
            <dt>Packages</dt>
            <dd>{data.counts.total}</dd>
          </div>
          <div>
            <dt>Collector complete</dt>
            <dd>{data.counts.collectorComplete}</dd>
          </div>
          <div>
            <dt>Needs editor</dt>
            <dd>{data.counts.needsEditor}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{data.counts.published}</dd>
          </div>
        </dl>
      </header>

      <section className="atlas-lib__toolbar" aria-label="Search and filters">
        <label className="atlas-lib__search-wrap">
          <span className="atlas-lib__search-label">Search artist, title, or RVTR</span>
          <input
            className="atlas-lib__search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search collected songs…"
            autoComplete="off"
          />
        </label>

        <div className="atlas-lib__filters">
          {FILTERS.map((filter) => {
            const active = activeFilters.has(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                className={`atlas-lib__filter${active ? " atlas-lib__filter--active" : ""}`}
                aria-pressed={active}
                onClick={() => toggleFilter(filter.id)}
              >
                {filter.label}
                <span className="atlas-lib__filter-count">{data.counts[filter.countKey]}</span>
              </button>
            );
          })}
        </div>

        <p className="atlas-lib__results">
          Showing {filtered.length} of {data.counts.total}
        </p>
      </section>

      <section className="atlas-lib__list" aria-label="Collected songs">
        {filtered.length > 0 ? (
          <>
            {visible.map((song) => (
              <SongRow key={song.rvtr} song={song} />
            ))}
            {hasMore ? (
              <button
                type="button"
                className="atlas-lib__load-more"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Load more ({filtered.length - visible.length} remaining)
              </button>
            ) : null}
          </>
        ) : (
          <p className="atlas-lib__empty">No songs match your search and filters.</p>
        )}
      </section>

      <p className="atlas-lib__back">
        <Link href="/ops">← Command Center</Link>
        {" · "}
        <Link href="/ops/atlas/architecture">Architecture</Link>
        {" · "}
        <Link href="/ops/studio/collector">Collector Library</Link>
      </p>
    </div>
  );
}
