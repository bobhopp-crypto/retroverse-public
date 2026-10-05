"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { vdjbxStillUrl, type VdjbxVideo } from "@/lib/vdjbx-catalog";

import "./guest-browser.css";

export type GuestSong = VdjbxVideo & { inLibrary?: boolean };
export type GuestShelf = { displayName: string; videos: GuestSong[]; itemCount: number };
export type GuestQueueRow = { position?: number; videoKey: string; title: string; artist: string };

function GuestStill({ videoKey, title }: { videoKey: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const src = vdjbxStillUrl(videoKey);
  if (!src || failed) return <span className="thumb-media thumb-media--fallback" aria-hidden="true">♫</span>;
  return <img className="thumb-media" src={src} alt="" title={title} onError={() => setFailed(true)} />;
}

type Props = {
  catalog: { videos: GuestSong[]; shelves: GuestShelf[]; totalVideos: number };
  query: string;
  results: GuestSong[];
  searching: boolean;
  message: string;
  queueByKey: Map<string, GuestQueueRow>;
  onQuery: (query: string) => void;
  onOpenDetail: (song: GuestSong) => void;
  onQueue: () => void;
  credits: ReactNode;
};

export function GuestBrowser({ catalog, query, results, searching, message, queueByKey, onQuery, onOpenDetail, onQueue, credits }: Props) {
  const [collection, setCollection] = useState<string | null>(null);
  const [limit, setLimit] = useState(24);
  const [mobileSurface, setMobileSurface] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("search") === "1") setMobileSearchOpen(true);
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setMobileSurface(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (mobileSurface && mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSurface, mobileSearchOpen]);
  const selected = catalog.shelves.find((shelf) => shelf.displayName === collection) || null;
  const searchingMode = Boolean(query.trim());
  const searchView = searchingMode || (mobileSurface && mobileSearchOpen);
  const categories = useMemo(() => catalog.shelves.filter((shelf) => shelf.videos.length >= 4), [catalog.shelves]);
  const songs: GuestSong[] = searchingMode ? results : (selected?.videos || []);
  const choose = (name: string) => { setCollection(name); setLimit(24); onQuery(""); };
  const home = !searchView && !selected;
  const closeMobileSearch = () => { setMobileSearchOpen(false); setCollection(null); onQuery(""); };

  return (
    <main className="guest-browser">
      <header className="guest-header">
        <div className="guest-brand-line">
          <div className="guest-credits guest-header-credits">{credits}</div>
          <button className="guest-queue" type="button" onClick={onQueue}>Your requests</button>
        </div>
        {mobileSurface && !mobileSearchOpen ? (
          <button type="button" className="mobile-search-feature" onClick={() => setMobileSearchOpen(true)}>
            <span>FIND A SONG</span>
            <strong>Search by artist or title</strong>
            <b aria-hidden="true">⌕</b>
          </button>
        ) : (
          <label className="guest-search mobile-search-input" htmlFor="guest-search">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg>
            <input
              ref={mobileSearchRef}
              id="guest-search"
              type="search"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setLimit(24);
                if (!value.trim()) setCollection(null);
                onQuery(value);
              }}
              placeholder="Search songs or artists"
              aria-label="Search the video collection by song or artist"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              autoFocus={mobileSurface && mobileSearchOpen}
            />
            {query ? <button type="button" onClick={() => { setCollection(null); onQuery(""); }} aria-label="Clear search">×</button> : null}
            {mobileSurface ? <button type="button" className="mobile-search-close" onClick={closeMobileSearch}>Close</button> : null}
          </label>
        )}
        <div className="guest-meta"><span>THE MAIN PUB · YOUR VIDEO COLLECTION</span></div>
      </header>
      {message ? <p className="guest-message" role="status">{message}</p> : null}
      {home ? (
        <section className="guest-home" aria-label="Browse collections">
          <div className="guest-list-heading"><h2>Browse the collection</h2><span>{categories.length} collections</span></div>
          <div className="guest-card-grid">
            {categories.map((shelf) => (
              <button className="guest-collection-card" type="button" key={shelf.displayName} onClick={() => choose(shelf.displayName)}>
                <span className="guest-card-collage">{shelf.videos.slice(0, 4).map((song) => <span key={song.videoKey}><GuestStill videoKey={song.videoKey} title={song.title} /></span>)}</span>
                <span className="guest-collection-copy"><strong>{shelf.displayName}</strong><small>{shelf.itemCount} videos</small></span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {!home ? (
        <section className="guest-songs" aria-label={searchView ? "Search results" : selected?.displayName || "Video collection"} aria-busy={searching}>
          <div className="guest-list-heading">
            <h2>{searchView ? "Search results" : selected?.displayName || "Video collection"}</h2>
            <span role="status">{searching ? "Searching…" : `${songs.length} songs`}</span>
          </div>
          <button className="guest-back" type="button" onClick={closeMobileSearch}>← Browse collections</button>
          <div className="guest-song-grid">
            {(searching ? [] : songs.slice(0, limit)).map((song) => {
              const requested = Boolean(song.videoKey && queueByKey.has(song.videoKey));
              return (
                <button className="guest-song-card" type="button" key={song.videoKey} onClick={() => onOpenDetail(song)} aria-label={`${song.title} by ${song.artist}. ${requested ? "Requested" : "Request"}`}>
                  <span className="guest-song-image">
                    <GuestStill videoKey={song.videoKey} title={song.title} />
                    <span className="guest-card-status">{requested ? "REQUESTED" : "REQUEST"}</span>
                  </span>
                  <span className="guest-song-copy"><strong>{song.title}</strong><span>{song.artist || "Unknown artist"}</span></span>
                </button>
              );
            })}
          </div>
          {!searching && !songs.length ? <p className="guest-empty">{searchView ? "Start typing to search songs or artists." : "Loading your video collection…"}</p> : null}
          {!searching && songs.length > limit ? <button className="guest-more" type="button" onClick={() => setLimit((count) => count + 24)}>Show more songs</button> : null}
        </section>
      ) : null}
    </main>
  );
}
