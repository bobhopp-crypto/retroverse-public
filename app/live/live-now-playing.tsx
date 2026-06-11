"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { SundayNightsLiveSelection } from "@/lib/sunday-nights/types";
import { trackPageHref } from "@/lib/search/entity-routes";
import type { TrackPageData } from "@/lib/track/load-track-page";

type Props = {
  initial: SundayNightsCurrentPayload;
};

const POLL_MS = 7000;

function displayFromTrack(
  track: TrackPageData | null,
  live: SundayNightsLiveSelection | null,
) {
  if (track) {
    return {
      title: track.title,
      artist: track.artistName,
      coverUrl: track.coverUrl,
      songHref: trackPageHref(track.rvtr),
      artistHref: track.artistHref,
      yearHref: track.rvYearHref,
      year: track.releaseYear,
    };
  }

  if (!live) return null;

  return {
    title: live.title,
    artist: live.artist,
    coverUrl: live.coverUrl ?? null,
    songHref: live.rvtr ? trackPageHref(live.rvtr) : null,
    artistHref: null as string | null,
    yearHref: live.year ? `/rv/${live.year}` : null,
    year: live.year,
  };
}

export function LiveNowPlayingView({ initial }: Props) {
  const [payload, setPayload] = useState(initial);
  const updatedAtRef = useRef(initial.updatedAt);

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
        /* ignore transient network errors */
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const display = displayFromTrack(payload.track, payload.live);

  return (
    <div className="live-page" aria-live="polite" aria-atomic="true">
      <header className="live-page__header">
        <Link href="/" className="live-page__brand">
          Retroverse
        </Link>
        <p className="live-page__kicker">Now playing</p>
      </header>

      {!display ? (
        <section className="live-page__waiting">
          <p className="live-page__waiting-text">Waiting for the next song…</p>
        </section>
      ) : (
        <section className="live-page__now">
          {display.coverUrl ? (
            <div className="live-page__cover-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={display.coverUrl}
                alt=""
                className="live-page__cover"
                width={360}
                height={360}
              />
            </div>
          ) : (
            <div className="live-page__cover-placeholder" aria-hidden>
              ♪
            </div>
          )}

          <h1 className="live-page__title">{display.title}</h1>
          <p className="live-page__artist">{display.artist}</p>
          {display.year ? <p className="live-page__year">{display.year}</p> : null}

          <nav className="live-page__actions" aria-label="Explore">
            {display.songHref ? (
              <Link href={display.songHref} className="live-page__btn live-page__btn--primary">
                Explore Song
              </Link>
            ) : null}
            {display.artistHref ? (
              <Link href={display.artistHref} className="live-page__btn">
                Explore Artist
              </Link>
            ) : null}
            {display.yearHref ? (
              <Link href={display.yearHref} className="live-page__btn">
                Explore Year
              </Link>
            ) : null}
          </nav>
        </section>
      )}
    </div>
  );
}
