"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GraphHeader } from "@/components/public/GraphHeader";

type SearchItem = {
  id: string;
  kind: "artist" | "song" | "album" | "year";
  title: string;
  artist?: string | null;
  year?: number | null;
  href: string;
  rvId?: string | null;
};

type ArtistSong = {
  rvtr: string;
  title: string;
  albumTitle: string | null;
  firstChartYear: number | null;
  firstChartDate: string | null;
  peakHot100: number | null;
};

type ReviewContext = {
  rvtr: string;
  title: string;
  artist: string;
  artistSlug: string;
  artistHref: string;
  albumTitle: string | null;
  albumHref: string | null;
  albumRval: string | null;
  year: number | null;
  yearHref: string | null;
  chartWeekLabel: string | null;
  chartWeekHref: string | null;
  routes: Record<PanelKey, string | null>;
  errors: Partial<Record<PanelKey, string | null>>;
  diagnostics: {
    rvtr: string;
    canonicalRvar: string | null;
    canonicalArtistId: string | null;
    canonicalAlbumId: string | null;
    loaderTier: string;
    coverSource: string;
    integrityWarningCount: number;
    integrityHref: string;
  };
};

type PanelKey = "homepage" | "song" | "artist" | "album" | "year" | "chartWeek";

type Panel = {
  key: PanelKey;
  label: string;
};

type FrameStatus = "idle" | "loading" | "ready" | "error";
type ReviewFilter = "all" | "problems" | "complete" | "flagged" | "vdj";
type PanelTone = "healthy" | "warning" | "error";
type SavedTrack = { rvtr: string; artist: string; title: string; savedAt: string };

const PANELS: Panel[] = [
  { key: "homepage", label: "Homepage" },
  { key: "song", label: "Song V3" },
  { key: "artist", label: "Artist V3" },
  { key: "album", label: "Album V3" },
  { key: "year", label: "Year V3" },
  { key: "chartWeek", label: "Chart Week V3" },
];

function extractRvtr(item: SearchItem): string | null {
  const direct = item.rvId?.trim().toUpperCase();
  if (direct && /^RVTR\d{6}$/.test(direct)) return direct;
  const match = item.href.match(/\/(?:retroverse-2\/)?song\/(RVTR\d{6})/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function slugFromArtistHref(href: string): string | null {
  const match = href.match(/\/artist\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

export function PublicV3ReviewStudio() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [artistSongs, setArtistSongs] = useState<ArtistSong[]>([]);
  const [artistName, setArtistName] = useState<string | null>(null);
  const [selectedRvtr, setSelectedRvtr] = useState<string | null>(null);
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [pending, setPending] = useState(false);
  const [frameStatus, setFrameStatus] = useState<Record<PanelKey, FrameStatus>>({
    homepage: "idle", song: "idle", artist: "idle", album: "idle", year: "idle", chartWeek: "idle",
  });
  const [message, setMessage] = useState("Search for a song title, artist name, or RVTR.");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [flaggedRvtrs, setFlaggedRvtrs] = useState<Record<string, number>>({});
  const [preloadedRvtr, setPreloadedRvtr] = useState<string | null>(null);
  const [clipboardTrack, setClipboardTrack] = useState<SavedTrack | null>(null);
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([]);
  const [showSavedTracks, setShowSavedTracks] = useState(false);
  const [frameVersions, setFrameVersions] = useState<Record<PanelKey, number>>({
    homepage: 0,
    song: 0,
    artist: 0,
    album: 0,
    year: 0,
    chartWeek: 0,
  });
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("retroverse-6-up-flags");
      if (stored) setFlaggedRvtrs(JSON.parse(stored) as Record<string, number>);
    } catch { /* local QA state is optional */ }
  }, []);

  useEffect(() => { void readJson<{ tracks: SavedTrack[] }>("/api/review/public-v3/saved-tracks").then((data) => setSavedTracks(data.tracks)).catch(() => undefined); }, []);

  useEffect(() => {
    if (!context) return;
    const timers = PANELS.map((panel) => window.setTimeout(() => {
      setFrameStatus((current) => current[panel.key] === "loading" ? { ...current, [panel.key]: "error" } : current);
    }, 10000));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [context, frameVersions]);

  useEffect(() => {
    let cancelled = false;
    if (filter !== "all" || pending) {
      setPreloadedRvtr(null);
      return;
    }
    void readJson<{ rvtr: string }>("/api/review/public-v3/random?filter=all")
      .then((data) => { if (!cancelled) setPreloadedRvtr(data.rvtr); })
      .catch(() => { if (!cancelled) setPreloadedRvtr(null); });
    return () => { cancelled = true; };
  }, [filter, pending, context]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    setResults([]);
    setArtistSongs([]);
    setArtistName(null);
    if (q.length < 2) {
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        setPending(true);
        if (/^RVTR\d{6}$/i.test(q)) {
          const rvtr = q.toUpperCase();
          setResults([
            {
              id: rvtr,
              kind: "song",
              title: rvtr,
              href: `/retroverse-2/song/${rvtr}`,
              rvId: rvtr,
            },
          ]);
          setMessage("Select the RVTR result to load the canonical song previews.");
          return;
        }
        const data = await readJson<{
          suggestions: {
            songs: SearchItem[];
            artists: SearchItem[];
            albums: SearchItem[];
            years: SearchItem[];
          };
        }>(`/api/search?q=${encodeURIComponent(q)}`);
        setResults([...data.suggestions.songs, ...data.suggestions.artists]);
        setMessage("Select a song result, or select an artist to choose one canonical song.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setPending(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function loadRvtr(rvtr: string) {
    try {
      setPending(true);
      setMessage(`Resolving ${rvtr}...`);
      const data = await readJson<{ context: ReviewContext }>(
        `/api/review/public-v3/resolve?rvtr=${encodeURIComponent(rvtr)}`,
      );
      setContext(data.context);
      setSelectedRvtr(data.context.rvtr);
      setFrameVersions({
        homepage: Date.now(),
        song: Date.now(),
        artist: Date.now(),
        album: Date.now(),
        year: Date.now(),
        chartWeek: Date.now(),
      });
      setFrameStatus({
        homepage: "loading", song: "loading", artist: "loading", album: "loading", year: "loading", chartWeek: "loading",
      });
      setMessage("All six previews loaded from the shared canonical song context.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not resolve song context.");
    } finally {
      setPending(false);
    }
  }

  async function randomSong() {
    try {
      setPending(true);
      const params = new URLSearchParams({ filter });
      if (filter === "flagged") params.set("rvtrs", Object.keys(flaggedRvtrs).join(","));
      const data = preloadedRvtr && filter === "all"
        ? { rvtr: preloadedRvtr }
        : await readJson<{ rvtr: string }>(`/api/review/public-v3/random?${params}`);
      setPreloadedRvtr(null);
      await loadRvtr(data.rvtr);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not select a random canonical song.");
      setPending(false);
    }
  }

  function copyTrack() { if (context) setClipboardTrack({ rvtr: context.rvtr, artist: context.artist, title: context.title, savedAt: new Date().toISOString() }); }
  function pasteTrack() { if (clipboardTrack) void loadRvtr(clipboardTrack.rvtr); }
  async function saveTrack() {
    if (!context) return;
    const data = await readJson<{ tracks: SavedTrack[] }>("/api/review/public-v3/saved-tracks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rvtr: context.rvtr, artist: context.artist, title: context.title }) });
    setSavedTracks(data.tracks);
  }
  async function removeSavedTrack(rvtr: string) {
    const data = await readJson<{ tracks: SavedTrack[] }>(`/api/review/public-v3/saved-tracks?rvtr=${rvtr}`, { method: "DELETE" });
    setSavedTracks(data.tracks);
  }

  async function selectSearchItem(item: SearchItem) {
    setArtistSongs([]);
    setArtistName(null);
    if (item.kind === "song") {
      const rvtr = extractRvtr(item);
      if (!rvtr) {
        setMessage("That song result does not expose a canonical RVTR.");
        return;
      }
      setSelectedRvtr(rvtr);
      await loadRvtr(rvtr);
      return;
    }

    if (item.kind === "artist") {
      const slug = slugFromArtistHref(item.href);
      if (!slug) {
        setMessage("That artist result does not expose a canonical artist route.");
        return;
      }
      try {
        setPending(true);
        const data = await readJson<{ artist: { displayName: string; songs: ArtistSong[] } }>(
          `/api/review/public-v3/artist-songs?slug=${encodeURIComponent(slug)}`,
        );
        setArtistName(data.artist.displayName);
        setArtistSongs(data.artist.songs);
        setMessage("Select one canonical artist song before loading the previews.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Could not load artist songs.");
      } finally {
        setPending(false);
      }
    }
  }

  const selectedSummary = useMemo(() => {
    if (!context) return null;
    return [
      ["Selected", context.title],
      ["Artist", context.artist],
      ["RVTR", context.rvtr],
      ["Album", context.albumTitle ?? "Unresolved"],
      ["Year", context.year?.toString() ?? "Unresolved"],
      ["Chart Week", context.chartWeekLabel ?? "Unresolved"],
    ];
  }, [context]);

  const panelSummary = useMemo(() => {
    const items = PANELS.map((panel) => {
      const status = frameStatus[panel.key];
      const tone: PanelTone = status === "ready" ? "healthy" : status === "error" ? "error" : "warning";
      return { label: panel.label.replace(" V3", ""), status, tone };
    });
    const counts = items.reduce((acc, item) => { acc[item.tone] += 1; return acc; }, { healthy: 0, warning: 0, error: 0 });
    return { items, counts };
  }, [frameStatus]);

  function reloadPanel(key: PanelKey) {
    setFrameStatus((current) => ({ ...current, [key]: "loading" }));
    setFrameVersions((current) => ({ ...current, [key]: Date.now() }));
  }

  function reloadAll() {
    const stamp = Date.now();
    setFrameVersions({
      homepage: stamp,
      song: stamp,
      artist: stamp,
      album: stamp,
      year: stamp,
      chartWeek: stamp,
    });
    setFrameStatus({
      homepage: "loading", song: "loading", artist: "loading", album: "loading", year: "loading", chartWeek: "loading",
    });
  }

  return (
    <main className="public-v3-review">
      <header className="public-v3-review__top">
        <div>
          <p className="public-v3-review__eyebrow">Retroverse QA Console</p>
          <h1>6-Up Viewer</h1>
        </div>
        <div className="public-v3-review__search"><input id="public-v3-review-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search song, artist, or RVTR" /><button type="button" onClick={() => selectedRvtr && void loadRvtr(selectedRvtr)} disabled={!selectedRvtr || pending}>Go</button></div>
        <div className="public-v3-review__keypad" aria-label="Operator controls">
          <button type="button" disabled>Previous</button><button type="button" disabled>Next</button><button type="button" onClick={() => void randomSong()} disabled={pending}>Random</button><button type="button" onClick={reloadAll} disabled={!context}>Refresh All</button>
          <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>All</button><button type="button" className={filter === "problems" ? "is-active" : ""} onClick={() => setFilter("problems")}>Problems</button><button type="button" className={filter === "complete" ? "is-active" : ""} onClick={() => setFilter("complete")}>Complete</button><button type="button" className={filter === "vdj" ? "is-active" : ""} onClick={() => setFilter("vdj")}>VDJ Library</button>
          <button type="button" onClick={copyTrack} disabled={!context}>Copy Track</button><button type="button" onClick={pasteTrack} disabled={!clipboardTrack}>Paste Track</button><button type="button" onClick={() => void saveTrack()} disabled={!context}>Save Track</button><button type="button" onClick={() => setShowSavedTracks(true)}>Saved Tracks</button>
          <button type="button" onClick={() => document.getElementById("public-v3-review-search")?.focus()}>Search</button><button type="button" onClick={() => selectedRvtr && void loadRvtr(selectedRvtr)} disabled={!selectedRvtr || pending}>Go</button><button type="button" onClick={() => { setQuery(""); setResults([]); setSelectedRvtr(null); }}>Clear</button><button type="button" disabled>Reserved</button>
        </div>
      </header>

      <section className="public-v3-review__status" aria-live="polite">
        <p>{pending ? "Working..." : message}</p>
        {selectedSummary ? (
          <dl>
            {selectedSummary.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section className="public-v3-review__qa-summary" aria-label="Viewer status summary">
        <div className="public-v3-review__filters">
          <span>Random source: {filter === "vdj" ? "VDJ Library" : filter[0].toUpperCase() + filter.slice(1)}</span>
        </div>
        <div className="public-v3-review__panel-summary">
          {panelSummary.items.map((item) => <span key={item.label} data-tone={item.tone}>{item.label} {item.tone === "healthy" ? "✓" : item.tone === "error" ? "✕" : "⚠"}</span>)}
          <strong>{panelSummary.counts.healthy} Healthy</strong><strong>{panelSummary.counts.warning} Warning</strong><strong>{panelSummary.counts.error} Errors</strong>
        </div>
        {filter === "vdj" ? <small>VirtualDJ library filtering uses the current canonical library source.</small> : null}
      </section>

      {showSavedTracks ? <div className="public-v3-review__saved-overlay" role="dialog" aria-modal="true" aria-label="Saved tracks">
        <section className="public-v3-review__saved-panel"><header><h2>Saved Tracks</h2><button type="button" onClick={() => setShowSavedTracks(false)}>Close</button></header>
          {savedTracks.length ? <table><thead><tr><th>RVTR</th><th>Artist</th><th>Song</th><th>Saved Date</th><th /></tr></thead><tbody>{savedTracks.map((track) => <tr key={track.rvtr}><td><button type="button" onClick={() => { setShowSavedTracks(false); void loadRvtr(track.rvtr); }}>{track.rvtr}</button></td><td>{track.artist}</td><td>{track.title}</td><td>{new Date(track.savedAt).toLocaleDateString()}</td><td><button type="button" onClick={() => void removeSavedTrack(track.rvtr)}>Remove</button></td></tr>)}</tbody></table> : <p>No saved tracks.</p>}
        </section>
      </div> : null}

      {context ? (
        <>
        <div className="public-v3-review__selected-song" aria-live="polite">
          <strong>{context.rvtr}</strong>
          <span>{context.title}</span>
          <span>by {context.artist}</span>
        </div>
        <GraphHeader data={{
          rvtr: context.rvtr,
          rvar: context.diagnostics.canonicalRvar,
          rval: context.albumRval,
          rvyr: context.year,
          rvwk: context.chartWeekLabel,
          integrity: `${context.diagnostics.integrityWarningCount} warnings`,
          relationshipStatus: context.albumTitle ? "resolved" : "missing album relationship",
          graphVersion: "canonical-v1",
          historicalAlbum: context.albumTitle,
          albumAppearanceCount: 1,
          enrichmentStatus: "six page enrichments layered independently",
        }} />
        </>
      ) : null}

      {results.length ? (
        <section className="public-v3-review__results" aria-label="Search results">
          {results.map((item) => (
            <button key={`${item.kind}-${item.id}`} type="button" onClick={() => void selectSearchItem(item)}>
              <strong>{item.title}</strong>
              <span>{item.kind === "artist" ? "Artist" : `${item.artist ?? "Song"}${item.year ? ` · ${item.year}` : ""}`}</span>
            </button>
          ))}
        </section>
      ) : null}

      {artistSongs.length ? (
        <section className="public-v3-review__artist-songs" aria-label={`${artistName ?? "Artist"} songs`}>
          <p>{artistName} canonical songs</p>
          <div>
            {artistSongs.map((song) => (
              <button key={song.rvtr} type="button" onClick={() => void loadRvtr(song.rvtr)}>
                <strong>{song.title}</strong>
                <span>{song.rvtr} · {song.firstChartYear ?? "Year unknown"}{song.peakHot100 ? ` · #${song.peakHot100}` : ""}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="public-v3-review__grid" aria-label="Public V3 previews">
        {PANELS.map((panel) => {
          const route = context?.routes[panel.key] ?? null;
          const error = context?.errors?.[panel.key] ?? (!context ? "Select a canonical song to load this panel." : null);
          const isWarning = panel.key === "year" && Boolean(error?.startsWith("No canonical year is available"));
          const src = route ? `${route}${route.includes("?") ? "&" : "?"}reviewFrame=${frameVersions[panel.key]}` : null;
          return (
            <article key={panel.key} className="public-v3-review__panel">
              <div className="public-v3-review__panel-head">
                <div>
                  <h2>{panel.label}</h2>
                  <p>{route ?? "No route resolved"}</p>
                </div>
                <div>
                  <button type="button" onClick={() => reloadPanel(panel.key)} disabled={!route}>
                    Reload
                  </button>
                    <a href={route ?? "#"} target="_blank" rel="noreferrer" aria-disabled={!route}>
                      Open Full Size
                  </a>
                </div>
              </div>
              <div className={`public-v3-review__phone${context?.diagnostics ? " public-v3-review__phone--diagnostic" : ""}`}>
                {context?.diagnostics ? (
                  <div className="public-v3-review__diagnostics">
                    <span>{context.diagnostics.rvtr}</span>
                    <span>Artist {context.diagnostics.canonicalRvar ?? "missing"}</span>
                    <span>internal artists.id: {context.diagnostics.canonicalArtistId ?? "missing"}</span>
                    <span>Album {context.diagnostics.canonicalAlbumId ?? "missing"}</span>
                    <span>{context.diagnostics.loaderTier}</span>
                    <span>{context.diagnostics.coverSource}</span>
                    <span>{context.diagnostics.integrityWarningCount} warnings</span>
                    <a href={context.diagnostics.integrityHref} target="_blank" rel="noreferrer">
                      Integrity
                    </a>
                  </div>
                ) : null}
                {src ? (
                  <>
                    {frameStatus[panel.key] === "loading" ? <div className="public-v3-review__frame-status">Loading {panel.label}…</div> : null}
                    {frameStatus[panel.key] === "error" ? <div className="public-v3-review__frame-status public-v3-review__frame-status--error">{panel.label} failed to load. Use Reload or Refresh All.</div> : null}
                    <iframe
                      key={`${panel.key}-${frameVersions[panel.key]}-${route}`}
                      title={panel.label}
                      src={src}
                      onLoad={() => setFrameStatus((current) => ({ ...current, [panel.key]: "ready" }))}
                      onError={() => setFrameStatus((current) => ({ ...current, [panel.key]: "error" }))}
                    />
                  </>
                ) : (
                  <div className={`public-v3-review__error${isWarning ? " public-v3-review__error--warning" : ""}`}>{error}</div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
