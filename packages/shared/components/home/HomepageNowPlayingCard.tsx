"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { HomeDiscoverSong, HomeNowPlaying } from "@/lib/home/homepage-types";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";

type Props = {
  initialNowPlaying: HomeNowPlaying | null;
  initialDiscoverSong: HomeDiscoverSong | null;
};

const POLL_MS = 8000;

function mapBridgeNowPlaying(payload: SundayNightsCurrentPayload): HomeNowPlaying | null {
  if (payload.live?.source !== "bridge" || !payload.currentTrackId?.trim()) {
    return null;
  }

  const track = payload.track;
  const live = payload.live;

  return {
    title: track?.title ?? live.title,
    artist: track?.artistName ?? live.artist,
    year: track?.releaseYear ?? live.year ?? null,
    coverUrl: track?.coverUrl ?? live.coverUrl ?? null,
    rvtr: payload.currentTrackId,
    liveHref: "/retroverse-2/live",
  };
}

function SpotlightCard({
  kicker,
  title,
  artist,
  year,
  coverUrl,
  ctaHref,
  ctaLabel,
}: {
  kicker: string;
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <section className="home-spotlight" aria-label={kicker}>
      <p className="home-spotlight__kicker">{kicker}</p>
      <div className="home-spotlight__body">
        <div className="home-spotlight__cover" aria-hidden>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="home-spotlight__cover-img" />
          ) : (
            <div className="home-spotlight__cover-fallback">♫</div>
          )}
        </div>
        <div className="home-spotlight__copy">
          <h2 className="home-spotlight__title">{title}</h2>
          <p className="home-spotlight__artist">{artist}</p>
          {year ? <p className="home-spotlight__year">{year}</p> : null}
          <Link href={ctaHref} className="home-spotlight__cta">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomepageNowPlayingCard({
  initialNowPlaying,
  initialDiscoverSong,
}: Props) {
  const [nowPlaying, setNowPlaying] = useState(initialNowPlaying);
  const [discoverSong] = useState(initialDiscoverSong);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as SundayNightsCurrentPayload;
        setNowPlaying(mapBridgeNowPlaying(payload));
      } catch {
        /* keep last known state */
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (nowPlaying) {
    return (
      <SpotlightCard
        kicker="Now Playing"
        title={nowPlaying.title}
        artist={nowPlaying.artist}
        year={nowPlaying.year}
        coverUrl={nowPlaying.coverUrl}
        ctaHref={nowPlaying.liveHref}
        ctaLabel="Open Live Experience →"
      />
    );
  }

  if (discoverSong) {
    return (
      <SpotlightCard
        kicker="Discover a Song"
        title={discoverSong.title}
        artist={discoverSong.artist}
        year={discoverSong.year}
        coverUrl={discoverSong.coverUrl}
        ctaHref={discoverSong.songHref}
        ctaLabel="Open Song →"
      />
    );
  }

  return null;
}
