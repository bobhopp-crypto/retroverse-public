"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  GuestCatalogTrack,
  GuestRequestReceipt,
  GuestRequestState,
} from "@/lib/song-requests/types";

type CatalogPayload = { tracks: GuestCatalogTrack[]; total: number; error?: string };
type CatalogSort = "title" | "artist";

const songCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export function GuestSongRequestPanel({ serial }: { serial: string }) {
  const [state, setState] = useState<GuestRequestState | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<CatalogSort>("title");
  const [catalog, setCatalog] = useState<CatalogPayload>({ tracks: [], total: 0 });
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [busyTrackKey, setBusyTrackKey] = useState<string | null>(null);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/pass/song-request?serial=${encodeURIComponent(serial)}`, { cache: "no-store" })
      .then((response) => readJson<GuestRequestState>(response))
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [serial]);

  useEffect(() => {
    if (!open || !state?.canRequest || catalogLoaded) return;
    const controller = new AbortController();
    setCatalogBusy(true);
    void fetch(
      `/api/pass/song-request/catalog?serial=${encodeURIComponent(serial)}&sort=title`,
      { cache: "no-store", signal: controller.signal },
    )
      .then((response) => readJson<CatalogPayload>(response))
      .then((payload) => {
        setCatalog(payload);
        setCatalogLoaded(true);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Catalog unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogBusy(false);
      });
    return () => {
      controller.abort();
    };
  }, [catalogLoaded, open, serial, state?.canRequest]);

  const visibleTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const matches = needle
      ? catalog.tracks.filter(
          (track) =>
            track.artist.toLocaleLowerCase().includes(needle) ||
            track.title.toLocaleLowerCase().includes(needle),
        )
      : catalog.tracks;

    return [...matches].sort((a, b) => {
      const primary = sortBy === "title"
        ? songCollator.compare(a.title, b.title)
        : songCollator.compare(a.artist, b.artist);
      if (primary !== 0) return primary;
      const secondary = sortBy === "title"
        ? songCollator.compare(a.artist, b.artist)
        : songCollator.compare(a.title, b.title);
      return secondary || songCollator.compare(a.key, b.key);
    });
  }, [catalog.tracks, query, sortBy]);

  if (!state?.enabled) return null;

  async function submit(track: GuestCatalogTrack) {
    setBusyTrackKey(track.key);
    setError(null);
    try {
      const payload = await readJson<{ ok: true; receipt: GuestRequestReceipt }>(
        await fetch("/api/pass/song-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serial,
            catalogTrackKey: track.key,
          }),
        }),
      );
      setState((current) =>
        current ? { ...current, canRequest: false, lastRequest: payload.receipt } : current,
      );
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed. Please try again.");
    } finally {
      setBusyTrackKey(null);
    }
  }

  if (!state.canRequest && state.lastRequest) {
    return (
      <section className="pass-request pass-request--receipt" aria-live="polite">
        <p className="pass-request__eyebrow">REQUEST RECEIVED</p>
        <h2>{state.lastRequest.title}</h2>
        <p className="pass-request__receipt-artist">{state.lastRequest.artist}</p>
        <p className="pass-request__receipt-thanks">Thanks for being part of tonight.</p>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="pass-request">
        <button type="button" className="pass-request__launch" onClick={() => setOpen(true)}>
          REQUEST A SONG
        </button>
      </section>
    );
  }

  return (
    <section className="pass-request pass-request--catalog">
      <div className="pass-request__catalog-head">
        <div>
          <p className="pass-request__eyebrow">RETROVERSE LIVE</p>
          <h2>REQUEST A SONG</h2>
          <p className="pass-request__instruction">Choose one song for tonight</p>
          <p className="pass-request__catalog-meta">
            <strong>{state.catalogName ?? "Tonight's Song Collection"}</strong>
            <span aria-hidden="true"> • </span>
            {state.availableSongCount.toLocaleString()} songs
          </p>
        </div>
        <button type="button" className="pass-request__close" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <div className="pass-request__browse-tools">
        <label className="pass-request__search">
          <span className="pass-request__visually-hidden">Search songs or artists</span>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search songs or artists"
          />
        </label>
        <div className="pass-request__sort" aria-label="Sort songs">
          <span>Sort by</span>
          <div role="group" aria-label="Sort songs by title or artist">
            {(["title", "artist"] as const).map((option) => (
              <button
                type="button"
                aria-pressed={sortBy === option}
                data-active={sortBy === option ? "true" : "false"}
                key={option}
                onClick={() => setSortBy(option)}
              >
                {option === "title" ? "Title" : "Artist"}
              </button>
            ))}
          </div>
        </div>
        <p className="pass-request__count" aria-live="polite">
          {catalogBusy
            ? "Loading songs…"
            : query.trim()
              ? `${visibleTracks.length.toLocaleString()} match${visibleTracks.length === 1 ? "" : "es"}`
              : `${visibleTracks.length.toLocaleString()} songs available`}
        </p>
      </div>

      <div className="pass-request__tracks" role="list" aria-label="Available songs">
        {visibleTracks.map((track) => (
          <article className="pass-request__track" role="listitem" key={track.key}>
            <div className="pass-request__track-copy">
              <h3>{track.title}</h3>
              <p>
                {track.artist}
                {track.year ? ` • ${track.year}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={busyTrackKey !== null}
              aria-label={`Request ${track.title} by ${track.artist}`}
              onClick={() => void submit(track)}
            >
              {busyTrackKey === track.key ? "SENDING…" : "REQUEST"}
            </button>
          </article>
        ))}
        {!catalogBusy && visibleTracks.length === 0 ? (
          <p className="pass-request__empty">No songs match that search.</p>
        ) : null}
      </div>

      {error ? <p className="pass-request__error">{error}</p> : null}
    </section>
  );
}
