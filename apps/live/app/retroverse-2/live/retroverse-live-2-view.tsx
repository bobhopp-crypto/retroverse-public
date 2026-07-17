"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { RV_CHRONOLOGY_DEFAULT_YEAR, rvYearHref } from "@/lib/rv/rv-chronology-paths";
import { artistPublicHrefFromName, trackPageHref } from "@/lib/search/entity-routes";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { TrackPageData } from "@/lib/track/load-track-page";
import { discoveryShelf } from "@/lib/public/discovery-contract";

type Props = {
  initial: SundayNightsCurrentPayload;
  shellClassName?: string;
  activeNav?: "live" | "search" | "years" | "charts";
  minimalHome?: boolean;
};

type HeroDisplay = {
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  songHref: string | null;
  artistHref: string | null;
  albumHref: string | null;
  yearHref: string | null;
  chartsHref: string | null;
  rvtr: string | null;
  track: TrackPageData | null;
};

const DEFAULT_POLL_MS = 7000;
const CHANNEL_POLL_MS = 3000;
const RE_RVTR = /^RVTR\d{6}$/i;

function chartsHrefFromTrack(track: TrackPageData): string | null {
  const chartWeek =
    (track.peakHot100 != null
      ? track.trajectoryWeeks.find((week) => week.rank === track.peakHot100)
      : null) ??
    track.trajectoryWeeks[track.trajectoryWeeks.length - 1] ??
    null;

  if (!chartWeek) return "/retroverse-2/charts";
  return chartWeekPortalHref(chartWeek.issueDate, {
    focus: track.rvtr,
    rank: chartWeek.rank,
  });
}

function displayFromTrack(track: TrackPageData): HeroDisplay {
  const album = track.albums.find((entry) => entry.href) ?? track.albums[0] ?? null;
  return {
    title: track.title,
    artist: track.artistName,
    year: track.releaseYear,
    coverUrl: track.coverUrl,
    songHref: trackPageHref(track.rvtr),
    artistHref: track.artistHref,
    albumHref: album?.href ?? null,
    yearHref: track.rvYearHref,
    chartsHref: chartsHrefFromTrack(track),
    rvtr: track.rvtr,
    track,
  };
}

function safeSongHref(payload: SundayNightsCurrentPayload): string | null {
  const rvtr = payload.currentTrackId?.trim() ?? "";
  if (RE_RVTR.test(rvtr)) {
    return trackPageHref(rvtr.toUpperCase());
  }

  const href = payload.destination.href?.trim() ?? "";
  if (href.startsWith("/retroverse-2/song/") && !href.includes("/Users")) {
    return href;
  }

  if (payload.live?.title?.trim() && payload.live.artist?.trim()) {
    const q = encodeURIComponent(`${payload.live.artist.trim()} ${payload.live.title.trim()}`);
    return `/search?q=${q}`;
  }

  return null;
}

function displayFromPayload(
  payload: SundayNightsCurrentPayload,
): HeroDisplay {
  if (payload.track) {
    return displayFromTrack(payload.track);
  }

  if (payload.live) {
    const artistHref = artistPublicHrefFromName(payload.live.artist);
    return {
      title: payload.live.title,
      artist: payload.live.artist,
      year: payload.live.year ?? null,
      coverUrl: payload.live.coverUrl ?? null,
      songHref: safeSongHref(payload),
      artistHref,
      albumHref: null,
      yearHref: payload.live.year ? rvYearHref(payload.live.year) : null,
      chartsHref: "/retroverse-2/charts",
      rvtr: RE_RVTR.test(payload.currentTrackId ?? "") ? payload.currentTrackId : null,
      track: null,
    };
  }

  return {
    title: "Retroverse Live",
    artist: "Current song unavailable",
    year: null,
    coverUrl: null,
    songHref: null,
    artistHref: null,
    albumHref: null,
    yearHref: null,
    chartsHref: null,
    rvtr: null,
    track: null,
  };
}

type ExploreAction = {
  label: string;
  href: string | null;
};

function ExploreActionButton({ label, href }: ExploreAction) {
  if (!href) {
    return (
      <span className="rv2-live__action rv2-live__action--disabled" aria-disabled="true">
        {label}
      </span>
    );
  }

  const className =
    label === "Song"
      ? "rv2-live__action rv2-live__action--primary"
      : "rv2-live__action";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function RetroverseLive2View({
  initial,
  shellClassName,
  activeNav = "live",
  minimalHome = false,
}: Props) {
  const [payload, setPayload] = useState(initial);
  const pollMs = payload.channel?.running ? CHANNEL_POLL_MS : DEFAULT_POLL_MS;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/sunday-nights/current?ts=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error(`Current song HTTP ${res.status}`);
        if (cancelled) return;
        const data = (await res.json()) as SundayNightsCurrentPayload;
        if (data.publicState?.version !== 2) {
          throw new Error("Unsupported current-song response");
        }
        if (cancelled) return;
        // Freshness can expire without a state write, so an unchanged updatedAt
        // must not prevent the UI from switching from Live to Now Exploring.
        setPayload(data);
      } catch {
        if (cancelled) return;
        // Do not replace a failed current-song lookup with a hard-coded song.
        setPayload((previous) => ({
          ...previous,
          currentTrackId: null,
          live: null,
          track: null,
          destination: {
            kind: "EXPERIENCE",
            href: "/",
          },
          channel: null,
          publicState: {
            version: 2,
            source: "recommendation",
            servedAt: new Date().toISOString(),
          },
        }));
      }
    }

    const id = window.setInterval(poll, pollMs);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  useEffect(() => {
    // Retire any worker/cache left by an older public build. The current Live
    // experience has no service worker and current-song responses are no-store.
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((entry) => entry.unregister())))
        .catch(() => undefined);
    }
    if ("caches" in window) {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined);
    }
  }, []);

  const isLiveNow =
    (payload.live?.source === "bridge" && Boolean(payload.live?.title?.trim())) ||
    payload.live?.source === "channel" ||
    payload.channel?.running === true;
  const display = useMemo(
    () => displayFromPayload(payload),
    [payload],
  );
  const exploreActions: ExploreAction[] = [
    { label: "Song", href: display.songHref },
    { label: "Artist", href: display.artistHref },
    {
      label: "Album",
      href: display.albumHref,
    },
    {
      label: "Year",
      href: display.yearHref ?? (display.year ? rvYearHref(display.year) : null),
    },
    { label: "Charts", href: display.chartsHref },
  ];

  return (
    <Rv2PublicShell
      className={shellClassName}
      activeNav={activeNav}
      yearsHref={display.yearHref ?? rvYearHref(RV_CHRONOLOGY_DEFAULT_YEAR)}
      minimalNavigation={minimalHome}
      broadcastChrome={minimalHome}
    >
      <section
        className={minimalHome ? "rv2-live__hero rv2-live__hero--minimal" : "rv2-live__hero"}
        aria-label={isLiveNow ? "Live now" : discoveryShelf("homeCurrentSong").displayLabel}
      >
        {minimalHome ? (
          <div className="rv2-live__minimal-current">
            {display.albumHref ? (
              <Link
                href={display.albumHref}
                className="rv2-live__art-wrap rv2-live__art-wrap--minimal"
                aria-label={`Open the album for ${display.title}`}
              >
                {display.coverUrl ? (
                  <img
                    src={display.coverUrl}
                    alt={`Album artwork for ${display.title}`}
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
              </Link>
            ) : (
              <div className="rv2-live__art-wrap rv2-live__art-wrap--minimal">
              {display.coverUrl ? (
                <img
                  src={display.coverUrl}
                  alt={`Album artwork for ${display.title}`}
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
            )}
            <h1 className="rv2-live__minimal-title">
              {display.songHref ? <Link href={display.songHref}>{display.title}</Link> : display.title}
            </h1>
            {display.artistHref ? (
              <Link href={display.artistHref} className="rv2-live__minimal-artist">
                {display.artist}
              </Link>
            ) : (
              <p className="rv2-live__minimal-artist">{display.artist}</p>
            )}
            {display.year ? (
              <Link
                href={display.yearHref ?? rvYearHref(display.year)}
                className="rv2-live__minimal-year"
              >
                {display.year}
              </Link>
            ) : null}
          </div>
        ) : (
          <>
        <div className="rv2-live__status-row">
          <p className={isLiveNow ? "rv2-live__status rv2-live__status--live" : "rv2-live__status"}>
            <span aria-hidden />
            {isLiveNow ? "Live Now" : discoveryShelf("homeCurrentSong").displayLabel}
          </p>
        </div>

        <div className="rv2-live__hero-card">
          <div className="rv2-live__copy">
            <p className="rv2-live__kicker">{isLiveNow ? "Now Playing" : "Featured Exploration"}</p>
            <h1>{display.title}</h1>
            <p className="rv2-live__artist">{display.artist}</p>
            {display.year ? <p className="rv2-live__year">{display.year}</p> : null}
          </div>

          {display.albumHref ? (
            <Link href={display.albumHref} className="rv2-live__art-wrap" aria-label={`Open ${display.title} album`}>
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
            </Link>
          ) : (
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
          )}
        </div>

        <nav className="rv2-live__actions rv2-live__actions--explore" aria-label="Explore current song">
          {exploreActions.map((action) => (
            <ExploreActionButton key={action.label} {...action} />
          ))}
        </nav>
          </>
        )}
      </section>
    </Rv2PublicShell>
  );
}
