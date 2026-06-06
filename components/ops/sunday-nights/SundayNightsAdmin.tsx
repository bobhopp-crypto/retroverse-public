"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  SUNDAY_EVENT_YEARS,
  type SundayEventPayload,
  type SundayMatchCandidate,
  type SundayPlaylistSong,
  type SundaySearchHit,
  type SundayYearFilter,
} from "@/lib/sunday-nights/playlist-types";
import type { TrackPageData } from "@/lib/track/load-track-page";
import type { SundayNightsState, SundayEventMode, SundayNightsLiveSelection } from "@/lib/sunday-nights/types";
import { trackPageHref } from "@/lib/search/entity-routes";
import { SundayNightsSystemPanel } from "@/components/ops/sunday-nights/SundayNightsSystemPanel";

type OpsPayload = SundayEventPayload & {
  state: SundayNightsState;
  track: TrackPageData | null;
  eventMode?: SundayEventMode;
  error?: string;
};

type SongVisualState = "live" | "played" | "default";

type YearCounts = Partial<Record<SundayYearFilter, number>>;

type MatchTarget = {
  key: string;
  artist: string;
  title: string;
  path: string;
};

const YEAR_OPTIONS: { id: SundayYearFilter; label: string }[] = [
  ...SUNDAY_EVENT_YEARS.map((y) => ({ id: y as SundayYearFilter, label: String(y) })),
  { id: "all", label: "ALL" },
];

const SEARCH_MIN = 2;
const SEARCH_DEBOUNCE_MS = 220;

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

type RvtrFilter = "all" | "rvtr" | "no-rvtr";

const RVTR_FILTER_OPTIONS: { id: RvtrFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "rvtr", label: "RVTR" },
  { id: "no-rvtr", label: "NO RVTR" },
];

function songVisualState(
  song: SundayPlaylistSong,
  live: SundayNightsLiveSelection | null,
  playedKeys: Set<string>,
): SongVisualState {
  if (live) {
    if (live.songKey && live.songKey === song.key) return "live";
    if (live.rvtr && live.rvtr === song.rvtr) return "live";
  }
  if (playedKeys.has(song.key) || (song.rvtr && playedKeys.has(song.rvtr))) {
    return "played";
  }
  return "default";
}

function rvtrLabel(rvtr: string | null): string {
  return rvtr ?? "NO RVTR";
}

export function SundayNightsAdmin() {
  const [state, setState] = useState<SundayNightsState | null>(null);
  const [track, setTrack] = useState<TrackPageData | null>(null);
  const [eventMode, setEventMode] = useState<SundayEventMode | null>(null);
  const [eventModeBusy, setEventModeBusy] = useState(false);
  const [eventMeta, setEventMeta] = useState<Pick<SundayEventPayload, "playlists" | "myListsPath">>({
    playlists: [],
    myListsPath: "",
  });
  const [yearFilter, setYearFilter] = useState<SundayYearFilter>(1967);
  const [yearCounts, setYearCounts] = useState<YearCounts>({});
  const [songs, setSongs] = useState<SundayPlaylistSong[]>([]);
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState<SundaySearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [playedKeys, setPlayedKeys] = useState<Set<string>>(() => new Set());
  const [rvtrFilter, setRvtrFilter] = useState<RvtrFilter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [matchTarget, setMatchTarget] = useState<MatchTarget | null>(null);
  const [matchCandidates, setMatchCandidates] = useState<SundayMatchCandidate[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [rememberMapping, setRememberMapping] = useState(true);
  const [savingMatch, setSavingMatch] = useState(false);
  const countsPrefetched = useRef(false);
  const searchTimer = useRef<number | null>(null);

  const applyPayload = useCallback((data: OpsPayload) => {
    setState(data.state);
    setTrack(data.track);
    if (data.eventMode) setEventMode(data.eventMode);
    setEventMeta({ playlists: data.playlists ?? [], myListsPath: data.myListsPath ?? "" });
    setYearFilter(data.yearFilter ?? 1967);
    setSongs(data.songs ?? []);
    if (data.yearFilter) {
      setYearCounts((prev) => ({ ...prev, [data.yearFilter]: data.songs?.length ?? 0 }));
    }
  }, []);

  const load = useCallback(
    async (year: SundayYearFilter) => {
      setLoading(true);
      const res = await fetch(
        `/api/ops/sunday-nights?year=${encodeURIComponent(String(year))}`,
        { cache: "no-store" },
      );
      setLoading(false);
      if (!res.ok) return;
      const data = (await res.json()) as OpsPayload;
      applyPayload(data);
    },
    [applyPayload],
  );

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

  useEffect(() => {
    const q = search.trim();
    if (q.length < SEARCH_MIN) {
      setSearchHits([]);
      setSearchLoading(false);
      return;
    }

    if (searchTimer.current != null) {
      window.clearTimeout(searchTimer.current);
    }

    setSearchLoading(true);
    searchTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/ops/sunday-nights/search?q=${encodeURIComponent(q)}&year=${encodeURIComponent(String(yearFilter))}`,
            { cache: "no-store" },
          );
          if (!res.ok) return;
          const data = (await res.json()) as { hits?: SundaySearchHit[] };
          setSearchHits(data.hits ?? []);
        } catch {
          setSearchHits([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    };
  }, [search, yearFilter]);

  const showSearchResults = search.trim().length >= SEARCH_MIN;

  async function toggleEventMode() {
    const nextEnabled = !(eventMode?.enabled ?? false);
    setEventModeBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/sunday-nights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "setEventMode", enabled: nextEnabled }),
      });
      const data = (await res.json()) as { eventMode?: SundayEventMode; error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Event mode update failed.");
        return;
      }
      setEventMode(data.eventMode ?? { enabled: nextEnabled, updatedAt: new Date().toISOString() });
      setMessage(nextEnabled ? "Event mode live." : "Event mode off.");
    } catch {
      setMessage("Event mode update failed.");
    } finally {
      setEventModeBusy(false);
    }
  }

  async function selectYear(year: SundayYearFilter) {
    setYearFilter(year);
    setMessage(null);
    await load(year);
  }

  function markPreviouslyLive(live: SundayNightsLiveSelection | null) {
    if (!live) return;
    setPlayedKeys((prev) => {
      const next = new Set(prev);
      if (live.songKey) next.add(live.songKey);
      if (live.rvtr) next.add(live.rvtr);
      return next;
    });
  }

  async function goLive(song: SundayPlaylistSong) {
    const busyId = song.key;
    setBusyKey(busyId);
    setMessage(null);
    const previousLive = state?.live ?? null;
    try {
      const res = await fetch("/api/ops/sunday-nights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "setTrack",
          live: {
            rvtr: song.rvtr,
            artist: song.artist,
            title: song.title,
            year: song.year,
            songKey: song.key,
          },
        }),
      });
      const data = (await res.json()) as {
        state?: SundayNightsState;
        track?: TrackPageData | null;
        live?: SundayNightsLiveSelection | null;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Update failed.");
        return;
      }
      if (previousLive) {
        markPreviouslyLive(previousLive);
      }
      if (data.state) setState(data.state);
      setTrack(data.track ?? null);
      setMessage("Live.");
    } catch {
      setMessage("Update failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function clearLive() {
    setBusyKey("__clear__");
    const previousLive = state?.live ?? null;
    try {
      const res = await fetch("/api/ops/sunday-nights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "setTrack", currentTrackId: null }),
      });
      const data = (await res.json()) as {
        state?: SundayNightsState;
        track?: TrackPageData | null;
      };
      if (res.ok) {
        markPreviouslyLive(previousLive);
        setState(data.state ?? null);
        setTrack(data.track ?? null);
        setMessage("Cleared.");
      }
    } finally {
      setBusyKey(null);
    }
  }

  function handleCardActivate(song: SundayPlaylistSong) {
    if (busyKey != null) return;
    void goLive(song);
  }

  async function openMatch(song: SundayPlaylistSong, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMatchTarget({
      key: song.key,
      artist: song.artist,
      title: song.title,
      path: song.path,
    });
    setRememberMapping(true);
    setMatchCandidates([]);
    setMatchLoading(true);
    try {
      const params = new URLSearchParams({ artist: song.artist, title: song.title });
      const res = await fetch(`/api/ops/sunday-nights/match?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { candidates?: SundayMatchCandidate[] };
      setMatchCandidates(data.candidates ?? []);
    } finally {
      setMatchLoading(false);
    }
  }

  async function saveMatch(candidate: SundayMatchCandidate) {
    if (!matchTarget) return;

    if (!rememberMapping) {
      setSongs((prev) =>
        prev.map((s) =>
          s.key === matchTarget.key ? { ...s, rvtr: candidate.rvtr } : s,
        ),
      );
      setMatchTarget(null);
      setMessage(`Matched → ${candidate.rvtr} (session only)`);
      return;
    }

    setSavingMatch(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/sunday-nights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "saveAlias",
          artist: matchTarget.artist,
          title: matchTarget.title,
          rvtr: candidate.rvtr,
          path: matchTarget.path,
          remember: rememberMapping,
          bankYear: yearFilter,
        }),
      });
      const data = (await res.json()) as OpsPayload & { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Match save failed.");
        return;
      }
      applyPayload(data);
      setMatchTarget(null);
      setMessage(`Matched → ${candidate.rvtr}`);
    } catch {
      setMessage("Match save failed.");
    } finally {
      setSavingMatch(false);
    }
  }

  async function addSearchHit(hit: SundaySearchHit) {
    if (hit.source === "asset" && hit.songKey) {
      setSearch("");
      setSearchHits([]);
      void goLive({
        key: hit.songKey,
        year: hit.year ?? (typeof yearFilter === "number" ? yearFilter : 1967),
        artist: hit.artist,
        title: hit.title,
        rvtr: hit.rvtr,
        path: hit.path ?? `asset://${hit.songKey}`,
        kind: "asset",
        assetType: hit.detail?.replace(/^Asset · /, "") ?? "other",
      });
      return;
    }

    setMessage(null);
    try {
      const res = await fetch("/api/ops/sunday-nights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "addToWorkingList",
          bankYear: yearFilter,
          year: hit.year ?? (typeof yearFilter === "number" ? yearFilter : new Date().getFullYear()),
          artist: hit.artist,
          title: hit.title,
          rvtr: hit.rvtr,
          path: hit.path ?? `search://${hit.artist}/${hit.title}`,
        }),
      });
      const data = (await res.json()) as OpsPayload & { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Could not add track.");
        return;
      }
      applyPayload(data);
      setSearch("");
      setSearchHits([]);
      setMessage("Added to rundown.");
    } catch {
      setMessage("Could not add track.");
    }
  }

  const liveRvtr = state?.currentTrackId ?? null;
  const liveSelection = state?.live ?? null;
  const liveArtist = track?.artistName ?? liveSelection?.artist ?? null;
  const liveTitle = track?.title ?? liveSelection?.title ?? null;
  const liveYear = track?.releaseYear ?? liveSelection?.year ?? null;

  const deckSongs = useMemo(() => {
    if (rvtrFilter === "rvtr") return songs.filter((s) => Boolean(s.rvtr));
    if (rvtrFilter === "no-rvtr") return songs.filter((s) => !s.rvtr);
    return songs;
  }, [songs, rvtrFilter]);

  const onAir = Boolean(liveSelection || (liveRvtr && track));
  const eventModeOn = eventMode?.enabled === true;
  const unmatchedCount = useMemo(
    () => deckSongs.filter((s) => !s.rvtr).length,
    [deckSongs],
  );

  return (
    <div className="sn-admin">
      <div className={`sn-admin__event-mode${eventModeOn ? " sn-admin__event-mode--live" : ""}`}>
        <div className="sn-admin__event-mode-copy">
          <p className="sn-admin__event-mode-label">
            {eventModeOn ? "EVENT MODE LIVE" : "EVENT MODE OFF"}
          </p>
          <p className="sn-admin__event-mode-detail">
            {eventModeOn
              ? "Homepage redirects to Sunday Nights"
              : "Homepage is normal Retroverse"}
          </p>
        </div>
        <button
          type="button"
          className={`sn-admin__btn sn-admin__event-mode-toggle${
            eventModeOn ? " sn-admin__event-mode-toggle--live" : ""
          }`}
          disabled={eventModeBusy}
          onClick={() => toggleEventMode()}
        >
          {eventModeBusy ? "…" : eventModeOn ? "Turn off" : "Go live"}
        </button>
      </div>

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
            {liveRvtr ? ` · ${liveRvtr}` : ""}
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
            disabled={busyKey != null || !liveSelection}
            onClick={() => clearLive()}
          >
            Clear
          </button>
        </div>
      </div>

      {unmatchedCount > 0 ? (
        <p className="sn-admin__unmatched-banner" role="status">
          {unmatchedCount} track{unmatchedCount === 1 ? "" : "s"} need matching — look for{" "}
          <strong>NO RVTR</strong>
        </p>
      ) : null}

      <div className="sn-admin__toolbar">
        <input
          type="search"
          className="sn-admin__search"
          placeholder="Search MyList, Retroverse, VirtualDJ…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {showSearchResults ? (
        <div className="sn-admin__search-panel" role="region" aria-label="Search results">
          <p className="sn-admin__search-panel-label">
            {searchLoading ? "Searching…" : `${searchHits.length} result${searchHits.length === 1 ? "" : "s"}`}
          </p>
          {searchHits.length === 0 && !searchLoading ? (
            <p className="sn-admin__empty sn-admin__empty--inline">No matches.</p>
          ) : (
            <ul className="sn-admin__search-list">
              {searchHits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="sn-admin__search-hit"
                    onClick={() => addSearchHit(hit)}
                  >
                    <span className="sn-admin__search-hit-artist">{hit.artist}</span>
                    <span className="sn-admin__search-hit-title">{hit.title}</span>
                    <span className="sn-admin__search-hit-meta">
                      <span className={hit.rvtr ? "sn-admin__rvtr" : "sn-admin__rvtr sn-admin__rvtr--missing"}>
                        {rvtrLabel(hit.rvtr)}
                      </span>
                      <span className="sn-admin__search-hit-source">{hit.detail ?? hit.source}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="sn-admin__banks" role="tablist" aria-label="RVTR filter">
        <p className="sn-admin__banks-label">Match</p>
        <div className="sn-admin__banks-row">
          {RVTR_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`sn-admin__bank sn-admin__bank--filter${
                rvtrFilter === opt.id ? " sn-admin__bank--active" : ""
              }`}
              onClick={() => setRvtrFilter(opt.id)}
            >
              <span className="sn-admin__bank-year">[{opt.label}]</span>
            </button>
          ))}
        </div>
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
        ) : deckSongs.length === 0 ? (
          <p className="sn-admin__empty">No songs for this year.</p>
        ) : (
          <ul className="sn-admin__deck" role="list">
            {deckSongs.map((song) => {
              const visual = songVisualState(song, liveSelection, playedKeys);
              const previewHref = song.rvtr ? trackPageHref(song.rvtr) : null;
              const isBusy = busyKey === song.key;
              const hasRvtr = Boolean(song.rvtr);

              return (
                <li key={song.key}>
                  <div
                    className={`sn-admin__card sn-admin__card--${visual}${
                      !hasRvtr ? " sn-admin__card--unmatched" : ""
                    }${song.kind === "asset" ? " sn-admin__card--asset" : ""}${
                      isBusy ? " sn-admin__card--busy" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="sn-admin__card-hit"
                      onClick={() => handleCardActivate(song)}
                      aria-label={`Go live: ${song.artist}, ${song.title}`}
                    >
                      <span className="sn-admin__card-artist">{song.artist}</span>
                      <span className="sn-admin__card-title">{song.title}</span>
                      {song.kind === "asset" && song.assetType ? (
                        <span className="sn-admin__asset-type">{song.assetType}</span>
                      ) : null}
                      <span
                        className={`sn-admin__rvtr${
                          hasRvtr ? " sn-admin__rvtr--ok" : " sn-admin__rvtr--missing"
                        }`}
                      >
                        {rvtrLabel(song.rvtr)}
                      </span>
                    </button>
                    {!hasRvtr ? (
                      <button
                        type="button"
                        className="sn-admin__card-match"
                        onClick={(e) => openMatch(song, e)}
                      >
                        Match
                      </button>
                    ) : null}
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
        {deckSongs.length} in rundown
      </p>

      {message ? (
        <p className="sn-admin__toast" role="status">
          {message}
        </p>
      ) : null}

      {matchTarget ? (
        <div className="sn-admin__match-backdrop" role="presentation" onClick={() => setMatchTarget(null)}>
          <div
            className="sn-admin__match-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sn-match-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="sn-match-title" className="sn-admin__match-kicker">
              Match to Retroverse
            </p>
            <p className="sn-admin__match-source-artist">{matchTarget.artist}</p>
            <p className="sn-admin__match-source-title">{matchTarget.title}</p>

            {matchLoading ? (
              <p className="sn-admin__empty sn-admin__empty--inline">Loading candidates…</p>
            ) : matchCandidates.length === 0 ? (
              <p className="sn-admin__empty sn-admin__empty--inline">No candidates found.</p>
            ) : (
              <ul className="sn-admin__match-list">
                {matchCandidates.map((candidate) => (
                  <li key={candidate.rvtr}>
                    <button
                      type="button"
                      className="sn-admin__match-option"
                      disabled={savingMatch}
                      onClick={() => saveMatch(candidate)}
                    >
                      <span className="sn-admin__match-option-title">{candidate.title}</span>
                      <span className="sn-admin__match-option-rvtr">{candidate.rvtr}</span>
                      {candidate.peakHot100 != null ? (
                        <span className="sn-admin__match-option-peak">Peak #{candidate.peakHot100}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="sn-admin__match-remember">
              <input
                type="checkbox"
                checked={rememberMapping}
                onChange={(e) => setRememberMapping(e.target.checked)}
              />
              Remember this mapping
            </label>

            <button
              type="button"
              className="sn-admin__btn sn-admin__match-cancel"
              onClick={() => setMatchTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <SundayNightsSystemPanel />

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
