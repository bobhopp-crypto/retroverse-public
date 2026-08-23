"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  JukeboxCatalogPayload,
  JukeboxCatalogTrack,
  JukeboxPublicState,
  JukeboxRequestReceipt,
  JukeboxSession,
} from "@/lib/song-requests/jukebox-types";

type Screen = "welcome" | "browse" | "detail" | "confirmation";
type StatePayload = { state: JukeboxPublicState; session: JukeboxSession | null };

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

function catalogUrl(input: { mode?: string; query?: string; decade?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (input.mode) params.set("mode", input.mode);
  if (input.query) params.set("q", input.query);
  if (input.decade != null) params.set("decade", String(input.decade));
  if (input.limit != null) params.set("limit", String(input.limit));
  return `/api/jukebox/catalog?${params.toString()}`;
}

function VideoCard({ track, onSelect }: { track: JukeboxCatalogTrack; onSelect: () => void }) {
  return (
    <button type="button" className="juke-card" onClick={onSelect} aria-label={`${track.title} by ${track.artist}`}>
      <span className="juke-card__image">
        <img src={track.heroUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />
        <span className="juke-card__play" aria-hidden="true">▶</span>
        {track.alreadyRequested ? <span className="juke-card__requested">REQUESTED ✓</span> : null}
      </span>
      <span className="juke-card__copy">
        <strong>{track.title}</strong>
        <span>{track.artist}{track.year ? ` · ${track.year}` : ""}</span>
      </span>
    </button>
  );
}

function VideoShelf({
  title,
  tracks,
  onSelect,
}: {
  title: string;
  tracks: JukeboxCatalogTrack[];
  onSelect: (track: JukeboxCatalogTrack) => void;
}) {
  if (tracks.length === 0) return null;
  return (
    <section className="juke-shelf">
      <h2>{title}</h2>
      <div className="juke-grid">
        {tracks.map((track) => <VideoCard key={track.key} track={track} onSelect={() => onSelect(track)} />)}
      </div>
    </section>
  );
}

export function VideoJukebox() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [state, setState] = useState<JukeboxPublicState | null>(null);
  const [session, setSession] = useState<JukeboxSession | null>(null);
  const [nickname, setNickname] = useState("");
  const [query, setQuery] = useState("");
  const [popular, setPopular] = useState<JukeboxCatalogTrack[]>([]);
  const [recent, setRecent] = useState<JukeboxCatalogTrack[]>([]);
  const [results, setResults] = useState<JukeboxCatalogTrack[]>([]);
  const [resultTitle, setResultTitle] = useState("SEARCH RESULTS");
  const [selected, setSelected] = useState<JukeboxCatalogTrack | null>(null);
  const [receipt, setReceipt] = useState<JukeboxRequestReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async (sessionId?: string | null) => {
    const url = sessionId ? `/api/jukebox?sessionId=${encodeURIComponent(sessionId)}` : "/api/jukebox";
    const payload = await readJson<StatePayload>(await fetch(url, { cache: "no-store" }));
    setState(payload.state);
    setSession(payload.session);
    return payload;
  }, []);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("retroverse.jukebox.session");
    void loadState(saved).then((payload) => {
      if (payload.session?.canRequest && !payload.session.endedAt) setScreen("browse");
      else if (saved) window.sessionStorage.removeItem("retroverse.jukebox.session");
    }).catch(() => setError("The video jukebox is warming up. Please try again."));
  }, [loadState]);

  const loadHome = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [popularPayload, recentPayload] = await Promise.all([
        readJson<JukeboxCatalogPayload>(await fetch(catalogUrl({ mode: "popular", limit: 12 }), { cache: "no-store" })),
        readJson<JukeboxCatalogPayload>(await fetch(catalogUrl({ mode: "recent", limit: 9 }), { cache: "no-store" })),
      ]);
      setPopular(popularPayload.tracks);
      setRecent(recentPayload.tracks);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The catalog is temporarily unavailable.");
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (screen === "browse" && popular.length === 0) void loadHome();
  }, [loadHome, popular.length, screen]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    if (screen !== "browse") return;
    const needle = query.trim();
    if (!needle) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingCatalog(true);
      void fetch(catalogUrl({ query: needle, limit: 60 }), { cache: "no-store", signal: controller.signal })
        .then((response) => readJson<JukeboxCatalogPayload>(response))
        .then((payload) => {
          setResults(payload.tracks);
          setResultTitle(`SEARCH RESULTS · ${payload.total}`);
          setError(null);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Search is unavailable.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoadingCatalog(false); });
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, screen]);

  async function startSession() {
    setBusy(true);
    setError(null);
    try {
      const payload = await readJson<{ ok: true; session: JukeboxSession }>(
        await fetch("/api/jukebox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start-session", nickname }),
        }),
      );
      window.sessionStorage.setItem("retroverse.jukebox.session", payload.session.sessionId);
      setSession(payload.session);
      setNickname("");
      setScreen("browse");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start a guest session.");
    } finally {
      setBusy(false);
    }
  }

  async function browseDecade(decade: number) {
    setLoadingCatalog(true);
    setQuery("");
    try {
      const payload = await readJson<JukeboxCatalogPayload>(
        await fetch(catalogUrl({ decade, limit: 60 }), { cache: "no-store" }),
      );
      setResults(payload.tracks);
      setResultTitle(`${decade === 2000 ? "2000s" : `${String(decade).slice(-2)}s`} · ${payload.total} VIDEOS`);
      window.requestAnimationFrame(() => document.getElementById("juke-results")?.scrollIntoView({ behavior: "smooth" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That decade is temporarily unavailable.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  function selectTrack(track: JukeboxCatalogTrack) {
    setSelected(track);
    setError(null);
    setScreen("detail");
    window.scrollTo({ top: 0 });
  }

  async function requestTrack() {
    if (!session || !selected) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await readJson<{ ok: true; receipt: JukeboxRequestReceipt }>(
        await fetch("/api/jukebox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "request", sessionId: session.sessionId, catalogTrackKey: selected.key }),
        }),
      );
      setReceipt(payload.receipt);
      const refreshed = await loadState(session.sessionId);
      setSession(refreshed.session);
      setScreen("confirmation");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function done() {
    const sessionId = session?.sessionId;
    setBusy(true);
    if (sessionId) {
      await fetch("/api/jukebox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end-session", sessionId }),
      }).catch(() => undefined);
    }
    window.sessionStorage.removeItem("retroverse.jukebox.session");
    setSession(null);
    setQuery("");
    setResults([]);
    setSelected(null);
    setReceipt(null);
    setScreen("welcome");
    setBusy(false);
    window.scrollTo({ top: 0 });
  }

  const limitText = useMemo(() => {
    if (!session) return "";
    if (session.requestLimit == null) return `${session.requestCount} requested · Unlimited`;
    return `${session.requestCount} of ${session.requestLimit} requested`;
  }, [session]);

  if (state && (!state.ready || !state.isOpen)) {
    return (
      <main className="juke-closed">
        <div className="juke-closed__mark" aria-hidden="true">RV</div>
        <p>RETROVERSE VIDEO JUKEBOX</p>
        <h1>We’ll be right back.</h1>
        <span>The DJ will open requests when the jukebox is ready.</span>
        <button type="button" onClick={() => void loadState(null)}>CHECK AGAIN</button>
      </main>
    );
  }

  if (screen === "welcome") {
    return (
      <main className="juke-welcome">
        <div className="juke-welcome__film" aria-hidden="true">
          <span /><span /><span />
        </div>
        <section className="juke-welcome__card">
          <p className="juke-kicker">RETROVERSE PRESENTS</p>
          <h1>VIDEO<br />JUKEBOX</h1>
          <p className="juke-welcome__lead">Pick the music videos you want the DJ to play.</p>
          <label className="juke-name">
            <span>NAME OR NICKNAME <em>OPTIONAL</em></span>
            <input value={nickname} maxLength={32} onChange={(event) => setNickname(event.target.value)} placeholder="Leave blank for Guest #" autoComplete="off" />
          </label>
          <button className="juke-primary" type="button" disabled={busy || !state?.ready} onClick={() => void startSession()}>
            {busy ? "STARTING…" : "START"}
          </button>
          {error ? <p className="juke-error" role="alert">{error}</p> : null}
        </section>
      </main>
    );
  }

  if (screen === "detail" && selected) {
    return (
      <main className="juke-detail">
        <header className="juke-detail__top">
          <button type="button" onClick={() => setScreen("browse")}>← BACK</button>
          <span>{session?.label}</span>
        </header>
        <section className="juke-detail__content">
          <div className="juke-detail__hero">
            <img src={selected.heroUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
            <span aria-hidden="true">▶</span>
          </div>
          <div className="juke-detail__copy">
            <p>YOU PICKED</p>
            <h1>{selected.title}</h1>
            <h2>{selected.artist}</h2>
            {selected.year ? <span className="juke-detail__year">{selected.year}</span> : null}
            <button className="juke-primary" type="button" disabled={busy || !session?.canRequest} onClick={() => void requestTrack()}>
              {busy ? "SENDING…" : "REQUEST THIS VIDEO"}
            </button>
            {error ? <p className="juke-error" role="alert">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  if (screen === "confirmation" && receipt) {
    return (
      <main className="juke-confirmation">
        <section>
          <div className="juke-confirmation__check" aria-hidden="true">✓</div>
          <p>{receipt.duplicate ? "ALREADY REQUESTED" : "REQUESTED"}</p>
          <h1>{receipt.title}</h1>
          <h2>{receipt.artist}</h2>
          <span>{session?.label} · {limitText}</span>
          {session?.canRequest ? (
            <button className="juke-primary" type="button" onClick={() => { setSelected(null); setReceipt(null); setScreen("browse"); }}>ADD ANOTHER</button>
          ) : null}
          <button className="juke-secondary" type="button" disabled={busy} onClick={() => void done()}>I’M DONE</button>
        </section>
      </main>
    );
  }

  return (
    <main className="juke-browse">
      <header className="juke-header">
        <div>
          <p>RETROVERSE</p>
          <strong>VIDEO JUKEBOX</strong>
        </div>
        <div className="juke-header__guest">
          <span>{session?.label}</span>
          <small>{limitText}</small>
        </div>
        <button type="button" onClick={() => void done()}>I’M DONE</button>
      </header>
      <section className="juke-search-wrap">
        <label className="juke-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH FOR A SONG OR ARTIST" autoComplete="off" enterKeyHint="search" />
          {query ? <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>×</button> : null}
        </label>
      </section>

      <div className="juke-content">
        {loadingCatalog ? <div className="juke-loading" role="status">LOADING VIDEOS…</div> : null}
        {error ? <p className="juke-error" role="alert">{error}</p> : null}
        {query ? (
          <VideoShelf title={resultTitle} tracks={results} onSelect={selectTrack} />
        ) : (
          <>
            <VideoShelf title="POPULAR HERE" tracks={popular} onSelect={selectTrack} />
            <VideoShelf title="RECENTLY PLAYED" tracks={recent} onSelect={selectTrack} />
            <section className="juke-decades">
              <h2>BROWSE BY DECADE</h2>
              <div>
                {(state?.decades ?? []).map((decade) => (
                  <button type="button" key={decade} onClick={() => void browseDecade(decade)}>
                    {decade === 2000 ? "2000s" : `${String(decade).slice(-2)}s`}
                  </button>
                ))}
              </div>
            </section>
            {results.length > 0 ? <div id="juke-results"><VideoShelf title={resultTitle} tracks={results} onSelect={selectTrack} /></div> : null}
          </>
        )}
      </div>
    </main>
  );
}
