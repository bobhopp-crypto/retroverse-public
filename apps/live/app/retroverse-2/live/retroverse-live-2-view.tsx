"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { RV_CHRONOLOGY_DEFAULT_YEAR, rvYearHref } from "@/lib/rv/rv-chronology-paths";
import { artistPublicHrefFromName, trackPageHref } from "@/lib/search/entity-routes";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { TrackPageData } from "@/lib/track/load-track-page";

type Props = {
  initial: SundayNightsCurrentPayload;
  shellClassName?: string;
  activeNav?: "live" | "search" | "years" | "charts";
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
const SAFE_FALLBACK_RVTR = "RVTR708312";

function chartsHrefFromTrack(track: TrackPageData): string | null {
  const peakDate =
    (track.peakHot100 != null
      ? track.trajectoryWeeks.find((week) => week.rank === track.peakHot100)?.issueDate
      : null) ??
    track.trajectoryWeeks[track.trajectoryWeeks.length - 1]?.issueDate ??
    track.firstChartDate;

  if (!peakDate) return "/retroverse-2/charts";
  return chartWeekPortalHref(peakDate, {
    focus: track.rvtr,
    rank: track.peakHot100 ?? undefined,
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
      chartsHref: null,
      rvtr: RE_RVTR.test(payload.currentTrackId ?? "") ? payload.currentTrackId : null,
      track: null,
    };
  }

  return {
    title: "Sweet Home Alabama",
    artist: "Lynyrd Skynyrd",
    year: 1974,
    coverUrl: null,
    songHref: trackPageHref(SAFE_FALLBACK_RVTR),
    artistHref: "/artist/lynyrd-skynyrd",
    albumHref: null,
    yearHref: rvYearHref(1974),
    chartsHref: "/retroverse-2/charts",
    rvtr: SAFE_FALLBACK_RVTR,
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
        // Never preserve an old live song when the authority is unavailable.
        setPayload((previous) => ({
          ...previous,
          currentTrackId: SAFE_FALLBACK_RVTR,
          live: null,
          track: null,
          destination: {
            kind: "EXPERIENCE",
            href: trackPageHref(SAFE_FALLBACK_RVTR),
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
  const cards = useMemo(() => storyCards(display, isLiveNow), [display, isLiveNow]);

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
    >
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

        <nav className="rv2-live__actions rv2-live__actions--explore" aria-label="Explore current song">
          {exploreActions.map((action) => (
            <ExploreActionButton key={action.label} {...action} />
          ))}
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
    </Rv2PublicShell>
  );
}
