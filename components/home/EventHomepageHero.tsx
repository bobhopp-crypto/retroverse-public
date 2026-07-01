"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { HomeNowPlaying } from "@/lib/home/homepage-types";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { liveSongExperienceHref } from "@/lib/live-control/experience-route";

type PreEventProps = {
  title: string;
  date: string;
  venue: string;
  heroImageUrl: string;
  registerHref: string;
  registerLabel: string;
};

type Props = PreEventProps & {
  initialNowPlaying: HomeNowPlaying | null;
};

const POLL_MS = 8000;

function mapBridgeNowPlaying(payload: SundayNightsCurrentPayload): HomeNowPlaying | null {
  if (payload.live?.source !== "bridge" || !payload.currentTrackId?.trim()) {
    return null;
  }

  const track = payload.track;
  const live = payload.live;
  const rvtr = payload.currentTrackId;

  return {
    title: track?.title ?? live.title,
    artist: track?.artistName ?? live.artist,
    year: track?.releaseYear ?? live.year ?? null,
    coverUrl: track?.coverUrl ?? live.coverUrl ?? null,
    rvtr,
    liveHref: liveSongExperienceHref(rvtr),
  };
}

function PreEventHero({
  title,
  date,
  venue,
  heroImageUrl,
  registerHref,
  registerLabel,
}: PreEventProps) {
  return (
    <section className="event-hero event-hero--pre" aria-label="Tonight's event">
      <div className="event-hero__art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImageUrl} alt="" className="event-hero__art-img" />
      </div>
      <div className="event-hero__copy">
        <p className="event-hero__eyebrow">Tonight at The Main Pub</p>
        <h1 className="event-hero__title">{title}</h1>
        <div className="event-hero__meta">
          <p className="event-hero__date">{date}</p>
          <p className="event-hero__venue">{venue}</p>
        </div>
        <Link href={registerHref} className="event-hero__cta">
          {registerLabel}
        </Link>
      </div>
    </section>
  );
}

function NowPlayingHero({ nowPlaying }: { nowPlaying: HomeNowPlaying }) {
  return (
    <section className="event-hero event-hero--live" aria-label="Now playing">
      <p className="event-hero__live-kicker">Now Playing</p>
      <div className="event-hero__live-body">
        <div className="event-hero__live-cover" aria-hidden>
          {nowPlaying.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nowPlaying.coverUrl} alt="" className="event-hero__live-cover-img" />
          ) : (
            <div className="event-hero__live-cover-fallback">♫</div>
          )}
        </div>
        <div className="event-hero__live-copy">
          <h1 className="event-hero__live-title">{nowPlaying.title}</h1>
          <p className="event-hero__live-artist">{nowPlaying.artist}</p>
          {nowPlaying.year ? (
            <p className="event-hero__live-year">{nowPlaying.year}</p>
          ) : null}
          <Link href={nowPlaying.liveHref} className="event-hero__cta event-hero__cta--secondary">
            Explore Song
          </Link>
        </div>
      </div>
    </section>
  );
}

export function EventHomepageHero(props: Props) {
  const [nowPlaying, setNowPlaying] = useState(props.initialNowPlaying);

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
    return <NowPlayingHero nowPlaying={nowPlaying} />;
  }

  return (
    <PreEventHero
      title={props.title}
      date={props.date}
      venue={props.venue}
      heroImageUrl={props.heroImageUrl}
      registerHref={props.registerHref}
      registerLabel={props.registerLabel}
    />
  );
}
