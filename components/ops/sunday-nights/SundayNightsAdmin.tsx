"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  SUNDAY_EVENT_YEARS,
  type SundayEventPayload,
  type SundayPlaylistSong,
  type SundayYearFilter,
} from "@/lib/sunday-nights/playlist-types";
import type { TrackPageData } from "@/lib/track/load-track-page";
import type { SundayNightsState } from "@/lib/sunday-nights/types";
import { trackPageHref } from "@/lib/search/entity-routes";

type OpsPayload = SundayEventPayload & {
  state: SundayNightsState;
  track: TrackPageData | null;
  error?: string;
};

type SongConsoleStatus = "live" | "played" | "ready";

type YearCounts = Partial<Record<SundayYearFilter, number>>;

const YEAR_OPTIONS: { id: SundayYearFilter; label: string }[] = [
  ...SUNDAY_EVENT_YEARS.map((y) => ({ id: y as SundayYearFilter, label: String(y) })),
  { id: "all", label: "ALL" },
];

const STATUS_LABEL: Record<SongConsoleStatus, string> = {
  live: "● LIVE",
  played: "✓ PLAYED",
  ready: "○ READY",
};

function formatUpdatedAt(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function songConsoleStatus(
  song: SundayPlaylistSong,
  liveRvtr: string | null,
  playedRvtrs: Set<string>,
): SongConsoleStatus {
  if (song.rvtr && song.rvtr === liveRvtr) return "live";
  if (song.rvtr && playedRvtrs.has(song.rvtr)) return "played";
  return "ready";
}

export function SundayNightsAdmin() {
  const [state, setState] = useState<SundayNightsState | null>(null);
  const [track, setTrack] = useState<TrackPageData | null>(null);
  const [eventMeta, setEventMeta] = useState<Pick<SundayEventPayload, "playlists" | "myListsPath">>({
    playlists: [],
    myListsPath: "",
  });
  const [yearFilter, setYearFilter] = useState<SundayYearFilter>(1967);
  const [yearCounts, setYearCounts] = useState<YearCounts>({});
  const [songs, setSongs] = useState<SundayPlaylistSong[]>([]);
  const [search, setSearch] = useState("");
  const [busyRvtr, setBusyRvtr] = useState<string | null>(null);
  const [playedRvtrs, setPlayedRvtrs] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const countsPrefetched = useRef(false);

  const load = useCallback(async (year: SundayYearFilter) => {
    setLoading(true);
    const res = await fetch(
      `/api/ops/sunday-nights?year=${encodeURIComponent(String(year))}`,
      { cache: "no-store" },
    );
    setLoading(false);
    if (!res.ok) return;
    const data = (await res.json()) as OpsPayload;
    setState(data.state);
    setTrack(data.track);
    setEventMeta({ playlists: data.playlists ?? [], myListsPath: data.myListsPath ?? "" });
    setYearFilter(data.yearFilter ?? year);
    setSongs(data.songs ?? []);
    setYearCounts((prev) => ({ ...prev, [year]: data.songs?.length ?? 0 }));
  }, []);

  useEffect(() => {
    void load(1967);
  }, [load]);

  useEffect(() => {
    if (countsPrefetched.current) return;
    countsPrefetched.current = true;

    const missing = [...SUNDAY_EVENT_YEARS, "all" as const].filter((y) => y !== 1967);
    void Promise.all(
      missing.map(async (year) => {
        const res = await fetch(
          `/api/ops/sunday-nights?year=${encodeURIComponent(String(year))}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as OpsPayload;
        setYearCounts((prev) => ({ ...prev, [year]: data.songs?.length ?? 0 }));
      }),
    );
  }, []);

  const filteredSongs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
    );
  }, [songs, search]);

  async function selectYear(year: SundayYearFilter) {
    setYearFilter(year);
    setMessage(null);
    await load(year);
  }

  function markPreviouslyLive(liveRvtr: string | null) {
    if (!liveRvtr) return;
    setPlayedRvtrs((prev) => {
      const next = new Set(prev);
      next.add(liveRvtr);
      return next;
    });
  }

  async function goLive(rvtr: string | null) {
    if (!rvtr) {
      setMessage("No RVTR — cannot go live.");
      return;
    }
    setBusyRvtr(rvtr);
    setMessage(null);
    const previousLive = state?.currentTrackId ?? null;
    try {
      const res = await fetch("/api/ops/sunday-nights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "setTrack", currentTrackId: rvtr }),
      });
      const data = (await res.json()) as {
        state?: SundayNightsState;
        track?: TrackPageData | null;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Update failed.");
        return;
      }
      if (previousLive && previousLive !== rvtr) {
        markPreviouslyLive(previousLive);
      }
      setState(data.state ?? null);
      setTrack(data.track ?? null);
      setMessage("Live.");
    } catch {
      setMessage("Update failed.");
    } finally {
      setBusyRvtr(null);
    }
  }

  async function clearLive() {
    setBusyRvtr("__clear__");
    const previousLive = state?.currentTrackId ?? null;
    try {
      const res = await fetch("/api/ops/sunday-nights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "setTrack", currentTrackId: null }),
      });
      const data = (await res.json()) as { state?: SundayNightsState; track?: TrackPageData | null };
      if (res.ok) {
        markPreviouslyLive(previousLive);
        setState(data.state ?? null);
        setTrack(data.track ?? null);
        setMessage("Cleared.");
      }
    } finally {
      setBusyRvtr(null);
    }
  }

  function handleCardActivate(song: SundayPlaylistSong) {
    if (busyRvtr != null) return;
    void goLive(song.rvtr);
  }

  const liveRvtr = state?.currentTrackId ?? null;
  const onAir = Boolean(liveRvtr && track);
  const liveArtist = track?.artistName ?? (liveRvtr ? "—" : null);
  const liveTitle = track?.title ?? (liveRvtr ? "Loading…" : null);
  const liveYear = track?.releaseYear ?? null;

  return (
    <div className="sn-admin">
      <div className={`sn-admin__on-air${onAir ? " sn-admin__on-air--active" : ""}`}>
        <div className="sn-admin__on-air-signal" aria-hidden>
          <span className="sn-admin__on-air-lamp" />
          <span className="sn-admin__on-air-tag">{onAir ? "ON AIR" : "STANDBY"}</span>
        </div>
        <div className="sn-admin__on-air-main">
          {onAir && liveArtist && liveTitle ? (
            <>
              <p className="sn-admin__on-air-artist">{liveArtist}</p>
              <p className="sn-admin__on-air-title">{liveTitle}</p>
              {liveYear ? (
                <p className="sn-admin__on-air-year">[{liveYear}]</p>
              ) : null}
            </>
          ) : (
            <p className="sn-admin__on-air-idle">No signal — select a track below</p>
          )}
          <p className="sn-admin__on-air-meta">
            Last update {formatUpdatedAt(state?.updatedAt)}
          </p>
        </div>
        <div className="sn-admin__on-air-actions">
          <Link
            className="sn-admin__btn sn-admin__btn--primary"
            href="/sunday-nights"
            target="_blank"
            rel="noopener noreferrer"
          >
            Public feed
          </Link>
          <button
            type="button"
            className="sn-admin__btn"
            disabled={busyRvtr != null || !liveRvtr}
            onClick={() => clearLive()}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="sn-admin__toolbar">
        <input
          type="search"
          className="sn-admin__search"
          placeholder="Search artist or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="sn-admin__banks" role="tablist" aria-label="Program year banks">
        <p className="sn-admin__banks-label">Years</p>
        <div className="sn-admin__banks-row">
          {YEAR_OPTIONS.map((opt) => {
            const count = yearCounts[opt.id];
            const countLabel =
              count != null
                ? `${count} track${count === 1 ? "" : "s"}`
                : "…";
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={yearFilter === opt.id}
                className={`sn-admin__bank${
                  yearFilter === opt.id ? " sn-admin__bank--active" : ""
                }`}
                disabled={loading && yearFilter !== opt.id}
                onClick={() => selectYear(opt.id)}
              >
                <span className="sn-admin__bank-year">[{opt.label}]</span>
                {opt.id !== "all" ? (
                  <span className="sn-admin__bank-count">{countLabel}</span>
                ) : (
                  <span className="sn-admin__bank-count">
                    {count != null ? `${count} total` : "…"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sn-admin__deck-wrap">
        {loading ? (
          <p className="sn-admin__empty">Loading rundown…</p>
        ) : filteredSongs.length === 0 ? (
          <p className="sn-admin__empty">
            {search.trim() ? "No matches." : "No songs for this year."}
          </p>
        ) : (
          <ul className="sn-admin__deck" role="list">
            {filteredSongs.map((song) => {
              const status = songConsoleStatus(song, liveRvtr, playedRvtrs);
              const previewHref = song.rvtr ? trackPageHref(song.rvtr) : null;
              const isBusy = busyRvtr === song.rvtr;

              return (
                <li key={song.key}>
                  <div
                    className={`sn-admin__card sn-admin__card--${status}${
                      isBusy ? " sn-admin__card--busy" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="sn-admin__card-hit"
                      onClick={() => handleCardActivate(song)}
                      aria-label={`Go live: ${song.artist}, ${song.title}, ${song.year}`}
                    >
                      <span className="sn-admin__card-top">
                        <span className="sn-admin__card-year">[{song.year}]</span>
                        <span
                          className={`sn-admin__card-status sn-admin__card-status--${status}`}
                          aria-label={status}
                        >
                          {isBusy ? "…" : STATUS_LABEL[status]}
                        </span>
                      </span>
                      <span className="sn-admin__card-artist">{song.artist}</span>
                      <span className="sn-admin__card-title">{song.title}</span>
                      {showDebug ? (
                        <span className="sn-admin__card-debug">
                          {song.rvtr ?? "no RVTR"}
                        </span>
                      ) : null}
                    </button>
                    {previewHref ? (
                      <a
                        className="sn-admin__card-preview"
                        href={previewHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Preview ${song.title}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="sn-admin__count">
        {filteredSongs.length} in rundown
        {search.trim() ? ` · “${search.trim()}”` : ""}
      </p>

      {message ? (
        <p className="sn-admin__toast" role="status">
          {message}
        </p>
      ) : null}

      <details className="sn-admin__fold">
        <summary>Debug</summary>
        <label className="sn-admin__check">
          <input
            type="checkbox"
            checked={showDebug}
            onChange={(e) => setShowDebug(e.target.checked)}
          />
          Show RVTR on cards
        </label>
        {liveRvtr ? (
          <p className="sn-admin__mono">Live RVTR: {liveRvtr}</p>
        ) : null}
      </details>

      <details className="sn-admin__fold">
        <summary>Advanced</summary>
        <p className="sn-admin__mono">MyLists: {eventMeta.myListsPath || "—"}</p>
        <p className="sn-admin__mono">
          Playlists:{" "}
          {eventMeta.playlists.map((p) => p.label).join(", ") || "—"}
        </p>
        {showAdvanced ? (
          <ul className="sn-admin__paths">
            {songs.slice(0, 50).map((s) => (
              <li key={`path-${s.key}`}>
                <span className="sn-admin__mono">{s.path}</span>
              </li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            className="sn-admin__link-btn"
            onClick={() => setShowAdvanced(true)}
          >
            Show file paths ({songs.length})
          </button>
        )}
      </details>
    </div>
  );
}
