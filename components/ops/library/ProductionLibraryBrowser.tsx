"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  filterLibrarySongs,
  sortLibrarySongs,
} from "@/lib/ops/library/query";
import type {
  LibraryFilterId,
  LibrarySortId,
  ProductionLibraryData,
  ProductionLibrarySong,
  SongHealthTone,
} from "@/lib/ops/library/types";

type Props = {
  data: ProductionLibraryData;
  initialFilter?: LibraryFilterId | null;
};

const DESKTOP_ROW_HEIGHT = 54;
const MOBILE_CARD_HEIGHT = 168;
const VIRTUAL_OVERSCAN = 6;

const SORT_OPTIONS: Array<{ id: LibrarySortId; label: string }> = [
  { id: "play_high", label: "Play count (highest)" },
  { id: "play_low", label: "Play count (lowest)" },
  { id: "recently_played", label: "Recently played" },
  { id: "recently_added", label: "Recently added" },
  { id: "year", label: "Year" },
  { id: "artist", label: "Artist" },
  { id: "title", label: "Title" },
  { id: "recently_updated", label: "Recently updated" },
];

const FILTER_GROUPS: Array<{
  title: string;
  filters: Array<{ id: LibraryFilterId; label: string; countKey: keyof ProductionLibraryData["counts"] }>;
}> = [
  {
    title: "Health",
    filters: [
      { id: "needs_work", label: "Needs work", countKey: "needsWork" },
      { id: "ready", label: "Ready", countKey: "ready" },
      { id: "published", label: "Published", countKey: "published" },
    ],
  },
  {
    title: "Missing",
    filters: [
      { id: "missing_cover", label: "Missing cover", countKey: "missingCover" },
      { id: "missing_story", label: "Missing story", countKey: "missingStory" },
      { id: "missing_charts", label: "Missing charts", countKey: "missingCharts" },
      { id: "missing_experience", label: "Missing experience", countKey: "missingExperience" },
    ],
  },
  {
    title: "Pipeline",
    filters: [{ id: "collector_complete", label: "Collector complete", countKey: "collectorComplete" }],
  },
  {
    title: "Video",
    filters: [
      { id: "has_video", label: "Has video", countKey: "hasVideo" },
      { id: "no_video", label: "No video", countKey: "noVideo" },
    ],
  },
  {
    title: "Play count",
    filters: [
      { id: "play_0", label: "0", countKey: "playCount0" },
      { id: "play_1", label: "1", countKey: "playCount1" },
      { id: "play_2_5", label: "2–5", countKey: "playCount2to5" },
      { id: "play_6_25", label: "6–25", countKey: "playCount6to25" },
      { id: "play_25_plus", label: "25+", countKey: "playCount25Plus" },
    ],
  },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ms);
}

function boolPill(value: boolean, yes = "Yes", no = "No") {
  return (
    <span className={`prod-lib__bool prod-lib__bool--${value ? "yes" : "no"}`}>{value ? yes : no}</span>
  );
}

function statusPill(label: string, tone: SongHealthTone | "ok" | "warn" | "dim" | "info") {
  return <span className={`prod-lib__pill prod-lib__pill--${tone}`}>{label}</span>;
}

function pipelinePill(song: ProductionLibrarySong) {
  if (song.collectorStatus === "complete") return statusPill("Complete", "ok");
  return statusPill("Partial", "warn");
}

function editorPill(status: ProductionLibrarySong["editorStatus"]) {
  if (status === "submitted") return statusPill("Submitted", "ok");
  if (status === "draft") return statusPill("Draft", "info");
  return statusPill("None", "dim");
}

function publisherPill(status: ProductionLibrarySong["publisherStatus"]) {
  if (status === "published") return statusPill("Published", "ok");
  if (status === "evaluated") return statusPill("Evaluated", "info");
  return statusPill("None", "dim");
}

function SongActions({ song }: { song: ProductionLibrarySong }) {
  return (
    <div className="prod-lib__actions">
      <Link href={song.links.song} className="prod-lib__action">
        Song
      </Link>
      <Link href={song.links.editor} className="prod-lib__action">
        Editor
      </Link>
      <Link href={song.links.collector} className="prod-lib__action">
        Collector
      </Link>
      <Link href={song.links.artist} className="prod-lib__action">
        Artist
      </Link>
      {song.links.album ? (
        <Link href={song.links.album} className="prod-lib__action">
          Album
        </Link>
      ) : (
        <span className="prod-lib__action prod-lib__action--disabled">Album</span>
      )}
      <Link href={song.links.vdjMatch} className="prod-lib__action">
        VDJ
      </Link>
    </div>
  );
}

function useVirtualRange(length: number, rowHeight: number, overscan: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 40 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - overscan);
      const visibleCount = Math.ceil(el.clientHeight / rowHeight) + overscan * 2;
      setRange({ start, end: Math.min(length, start + visibleCount) });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [length, overscan, rowHeight]);

  return { containerRef, range };
}

function DesktopTable({ songs }: { songs: ProductionLibrarySong[] }) {
  const { containerRef, range } = useVirtualRange(songs.length, DESKTOP_ROW_HEIGHT, VIRTUAL_OVERSCAN);
  const visible = songs.slice(range.start, range.end);
  const topSpacer = range.start * DESKTOP_ROW_HEIGHT;
  const bottomSpacer = Math.max(0, (songs.length - range.end) * DESKTOP_ROW_HEIGHT);

  return (
    <div className="prod-lib__table-wrap" ref={containerRef}>
      <table className="prod-lib__table">
        <thead>
          <tr>
            <th>Cover</th>
            <th>Title</th>
            <th>Artist</th>
            <th>Year</th>
            <th>RVTR</th>
            <th>Plays</th>
            <th>Collector</th>
            <th>Editor</th>
            <th>Published</th>
            <th>Charts</th>
            <th>Cover</th>
            <th>Story</th>
            <th>Experience</th>
            <th>Health</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {topSpacer > 0 ? (
            <tr aria-hidden className="prod-lib__spacer-row">
              <td colSpan={16} style={{ height: topSpacer, padding: 0, border: 0 }} />
            </tr>
          ) : null}
          {visible.map((song) => (
            <tr key={song.rvtr}>
              <td>
                <div className="prod-lib__cover" aria-hidden>
                  {song.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={song.coverUrl} alt="" />
                  ) : (
                    <span>♫</span>
                  )}
                </div>
              </td>
              <td className="prod-lib__title-cell">
                <Link href={song.links.song}>{song.title}</Link>
              </td>
              <td>{song.artist}</td>
              <td>{song.year ?? "—"}</td>
              <td className="prod-lib__mono">{song.rvtr}</td>
              <td className="prod-lib__num">{song.playCount}</td>
              <td>{pipelinePill(song)}</td>
              <td>{editorPill(song.editorStatus)}</td>
              <td>{publisherPill(song.publisherStatus)}</td>
              <td>{boolPill(song.hasChartJourney)}</td>
              <td>{boolPill(Boolean(song.coverUrl))}</td>
              <td>{boolPill(song.hasStory)}</td>
              <td>{boolPill(song.hasExperience)}</td>
              <td>{statusPill(song.health.label, song.health.tone)}</td>
              <td>{formatDate(song.lastUpdated)}</td>
              <td>
                <SongActions song={song} />
              </td>
            </tr>
          ))}
          {bottomSpacer > 0 ? (
            <tr aria-hidden className="prod-lib__spacer-row">
              <td colSpan={16} style={{ height: bottomSpacer, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({ songs }: { songs: ProductionLibrarySong[] }) {
  const { containerRef, range } = useVirtualRange(songs.length, MOBILE_CARD_HEIGHT, 4);
  const visible = songs.slice(range.start, range.end);
  const topSpacer = range.start * MOBILE_CARD_HEIGHT;
  const bottomSpacer = Math.max(0, (songs.length - range.end) * MOBILE_CARD_HEIGHT);

  return (
    <div className="prod-lib__cards" ref={containerRef}>
      {topSpacer > 0 ? <div style={{ height: topSpacer }} aria-hidden /> : null}
      {visible.map((song) => (
        <article key={song.rvtr} className="prod-lib__card">
          <div className="prod-lib__card-top">
            <div className="prod-lib__cover prod-lib__cover--card" aria-hidden>
              {song.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={song.coverUrl} alt="" />
              ) : (
                <span>♫</span>
              )}
            </div>
            <div>
              <p className="prod-lib__card-rvtr">{song.rvtr}</p>
              <h2 className="prod-lib__card-title">
                <Link href={song.links.song}>{song.title}</Link>
              </h2>
              <p className="prod-lib__card-artist">{song.artist}</p>
              <p className="prod-lib__card-meta">
                {song.year ?? "Year unknown"} · {song.playCount} plays
              </p>
            </div>
            <div>{statusPill(song.health.label, song.health.tone)}</div>
          </div>
          <dl className="prod-lib__card-stats">
            <div>
              <dt>Collector</dt>
              <dd>{song.collectorStatus === "complete" ? "Complete" : "Partial"}</dd>
            </div>
            <div>
              <dt>Story</dt>
              <dd>{song.hasStory ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Charts</dt>
              <dd>{song.hasChartJourney ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(song.lastUpdated)}</dd>
            </div>
          </dl>
          <SongActions song={song} />
        </article>
      ))}
      {bottomSpacer > 0 ? <div style={{ height: bottomSpacer }} aria-hidden /> : null}
    </div>
  );
}

export function ProductionLibraryBrowser({ data, initialFilter = null }: Props) {
  const [query, setQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [sort, setSort] = useState<LibrarySortId>("play_high");
  const [activeFilters, setActiveFilters] = useState<Set<LibraryFilterId>>(() =>
    initialFilter ? new Set([initialFilter]) : new Set(),
  );

  const filtered = useMemo(
    () =>
      filterLibrarySongs(data.songs, {
        query,
        artistQuery,
        year: year === "" ? null : year,
        activeFilters,
      }),
    [activeFilters, artistQuery, data.songs, query, year],
  );

  const sorted = useMemo(() => sortLibrarySongs(filtered, sort), [filtered, sort]);

  function toggleFilter(id: LibraryFilterId) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="prod-lib">
      <header className="prod-lib__hero">
        <p className="prod-lib__eyebrow">Production Library</p>
        <h1 className="prod-lib__title">Library</h1>
        <p className="prod-lib__lead">
          Every Retroverse song in one place — play count, pipeline health, and one-click production links.
        </p>
        <dl className="prod-lib__counts">
          <div>
            <dt>Songs</dt>
            <dd>{data.counts.total}</dd>
          </div>
          <div>
            <dt>Ready</dt>
            <dd>{data.counts.ready}</dd>
          </div>
          <div>
            <dt>Needs work</dt>
            <dd>{data.counts.needsWork}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{data.counts.published}</dd>
          </div>
        </dl>
      </header>

      <section className="prod-lib__toolbar" aria-label="Search, filters, and sort">
        <div className="prod-lib__toolbar-row">
          <label className="prod-lib__field">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, artist, or RVTR…"
              autoComplete="off"
            />
          </label>
          <label className="prod-lib__field">
            <span>Artist</span>
            <input
              type="search"
              value={artistQuery}
              onChange={(event) => setArtistQuery(event.target.value)}
              placeholder="Filter by artist…"
              autoComplete="off"
            />
          </label>
          <label className="prod-lib__field prod-lib__field--compact">
            <span>Year</span>
            <select value={year} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : "")}>
              <option value="">All years</option>
              {data.years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="prod-lib__field prod-lib__field--compact">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as LibrarySortId)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {FILTER_GROUPS.map((group) => (
          <div key={group.title} className="prod-lib__filter-group">
            <p className="prod-lib__filter-title">{group.title}</p>
            <div className="prod-lib__filters">
              {group.filters.map((filter) => {
                const active = activeFilters.has(filter.id);
                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={`prod-lib__filter${active ? " prod-lib__filter--active" : ""}`}
                    aria-pressed={active}
                    onClick={() => toggleFilter(filter.id)}
                  >
                    {filter.label}
                    <span className="prod-lib__filter-count">{data.counts[filter.countKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <p className="prod-lib__results">
          Showing {sorted.length} of {data.counts.total}
        </p>
      </section>

      <section className="prod-lib__desktop" aria-label="Song library table">
        {sorted.length > 0 ? (
          <DesktopTable songs={sorted} />
        ) : (
          <p className="prod-lib__empty">No songs match your search and filters.</p>
        )}
      </section>

      <section className="prod-lib__mobile" aria-label="Song library cards">
        {sorted.length > 0 ? (
          <MobileCards songs={sorted} />
        ) : (
          <p className="prod-lib__empty">No songs match your search and filters.</p>
        )}
      </section>

      <p className="prod-lib__back">
        <Link href="/ops">← Command Center</Link>
      </p>
    </div>
  );
}
