"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { TrackPageData } from "@/lib/track/load-track-page";

type Props = {
  initial: SundayNightsCurrentPayload;
  exploringTrack: TrackPageData | null;
};

type HeroDisplay = {
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  songHref: string | null;
  artistHref: string | null;
  yearHref: string | null;
  rvtr: string | null;
  track: TrackPageData | null;
};

const DEFAULT_POLL_MS = 7000;
const CHANNEL_POLL_MS = 3000;

function displayFromPayload(
  payload: SundayNightsCurrentPayload,
  exploringTrack: TrackPageData | null,
): HeroDisplay {
  if (payload.track) {
    return {
      title: payload.track.title,
      artist: payload.track.artistName,
      year: payload.track.releaseYear,
      coverUrl: payload.track.coverUrl,
      songHref: `/retroverse-2/song/${payload.track.rvtr}`,
      artistHref: payload.track.artistHref,
      yearHref: payload.track.rvYearHref,
      rvtr: payload.currentTrackId,
      track: payload.track,
    };
  }

  if (payload.live) {
    return {
      title: payload.live.title,
      artist: payload.live.artist,
      year: payload.live.year ?? null,
      coverUrl: payload.live.coverUrl ?? null,
      songHref: payload.destination.href,
      artistHref: null,
      yearHref: payload.live.year ? `/rv/${payload.live.year}` : null,
      rvtr: payload.currentTrackId,
      track: null,
    };
  }

  if (exploringTrack) {
    return {
      title: exploringTrack.title,
      artist: exploringTrack.artistName,
      year: exploringTrack.releaseYear,
      coverUrl: exploringTrack.coverUrl,
      songHref: `/retroverse-2/song/${exploringTrack.rvtr}`,
      artistHref: exploringTrack.artistHref,
      yearHref: exploringTrack.rvYearHref,
      rvtr: exploringTrack.rvtr,
      track: exploringTrack,
    };
  }

  return {
    title: "Sweet Home Alabama",
    artist: "Lynyrd Skynyrd",
    year: 1974,
    coverUrl: null,
    songHref: "/search?q=Sweet%20Home%20Alabama",
    artistHref: "/search?q=Lynyrd%20Skynyrd",
    yearHref: "/rv/1974",
    rvtr: null,
    track: null,
  };
}

function storyCards(display: HeroDisplay, isLiveNow: boolean) {
  const track = display.track;
  const album = track?.albums.find((entry) => entry.title)?.title ?? null;

  return [
    isLiveNow
      ? {
          label: "Live Now",
          title: "Playing In The Room",
          copy: "This is the song currently leading the Retroverse journey.",
        }
      : {
          label: "Now Exploring",
          title: "Open The Story",
          copy: "Start with this song and follow the artist, year, and album connections.",
        },
    track?.peakHot100
      ? {
          label: `Hot 100 #${track.peakHot100}`,
          title: "Chart Success",
          copy: `${display.title} reached #${track.peakHot100} and stayed visible for ${track.chartWeeks || "multiple"} chart weeks.`,
        }
      : null,
    display.year
      ? {
          label: String(display.year),
          title: `${display.year} Context`,
          copy: `Explore the records, artists, and chart history connected to ${display.year}.`,
        }
      : null,
    album
      ? {
          label: album,
          title: "Album Connection",
          copy: `${display.title} belongs to a larger album world worth exploring.`,
        }
      : null,
    display.artist
      ? {
          label: display.artist,
          title: "Artist Trail",
          copy: `Follow ${display.artist} through songs, records, and chart moments.`,
        }
      : null,
  ].filter((card): card is { label: string; title: string; copy: string } => card != null).slice(0, 3);
}

export function RetroverseLive2View({ initial, exploringTrack }: Props) {
  const [payload, setPayload] = useState(initial);
  const updatedAtRef = useRef(initial.updatedAt);
  const pollMs = payload.channel?.running ? CHANNEL_POLL_MS : DEFAULT_POLL_MS;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SundayNightsCurrentPayload;
        if (cancelled || data.updatedAt === updatedAtRef.current) return;
        updatedAtRef.current = data.updatedAt;
        setPayload(data);
      } catch {
        /* keep the last good live/exploring state */
      }
    }

    const id = window.setInterval(poll, pollMs);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  const isLiveNow =
    payload.live?.source === "bridge" ||
    payload.live?.source === "channel" ||
    payload.channel?.running === true;
  const display = useMemo(
    () => displayFromPayload(payload, exploringTrack),
    [payload, exploringTrack],
  );
  const cards = useMemo(() => storyCards(display, isLiveNow), [display, isLiveNow]);

  return (
    <main className="rv2-live">
      <div className="rv2-live__grid-glow" aria-hidden />
      <header className="rv2-live__topbar">
        <Link href="/" className="rv2-live__brand" aria-label="Retroverse home">
          Retroverse
        </Link>
        <nav className="rv2-live__nav" aria-label="Retroverse sections">
          <Link href="/retroverse-2/live">Live</Link>
          <Link href="/search">Search</Link>
          <Link href={display.yearHref ?? "/rv/1974"}>Years</Link>
        </nav>
      </header>

      <section className="rv2-live__search-panel" aria-label="Global search">
        <p className="rv2-live__eyebrow">Global Search</p>
        <form className="rv2-live__search" action="/search">
          <input name="q" type="search" placeholder="Search music..." />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="rv2-live__hero" aria-label={isLiveNow ? "Live now" : "Now exploring"}>
        <div className="rv2-live__status-row">
          <p className={isLiveNow ? "rv2-live__status rv2-live__status--live" : "rv2-live__status"}>
            <span aria-hidden />
            {isLiveNow ? "Live Now" : "Now Exploring"}
          </p>
        </div>

        <div className="rv2-live__hero-card">
          <div className="rv2-live__copy">
            <p className="rv2-live__kicker">{isLiveNow ? "Now Playing" : "Featured Exploration"}</p>
            <h1>{display.title}</h1>
            <p className="rv2-live__artist">{display.artist}</p>
            {display.year ? <p className="rv2-live__year">{display.year}</p> : null}
          </div>

          <div className="rv2-live__art-wrap">
            {display.coverUrl ? (
              <img
                src={display.coverUrl}
                alt=""
                className="rv2-live__art"
                width={520}
                height={520}
                decoding="async"
              />
            ) : (
              <div className="rv2-live__art-placeholder" aria-hidden>
                RV
              </div>
            )}
          </div>
        </div>

        <nav className="rv2-live__actions" aria-label="Explore current song">
          <Link href={display.songHref ?? "/search"} className="rv2-live__action rv2-live__action--primary">
            Explore Song
          </Link>
          <Link href={display.artistHref ?? `/search?q=${encodeURIComponent(display.artist)}`} className="rv2-live__action">
            Explore Artist
          </Link>
          <Link href={display.yearHref ?? (display.year ? `/rv/${display.year}` : "/search")} className="rv2-live__action">
            Explore Year
          </Link>
        </nav>
      </section>

      <section className="rv2-live__story" aria-label="Why this song matters">
        <p className="rv2-live__eyebrow">Why This Song Matters</p>
        <div className="rv2-live__story-grid">
          {cards.map((card) => (
            <article className="rv2-live__story-card" key={card.title}>
              <p className="rv2-live__story-label">{card.label}</p>
              <h2>{card.title}</h2>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
