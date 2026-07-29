"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HomeSearchInput } from "@/app/components/home-search-input";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import {
  externalDiscoveryQuery,
  externalSearchHref,
} from "@/lib/public/external-search";
import type { PublicHomepagePayload } from "@/lib/home/public-current-song";
import type { HomepageHero } from "@/lib/ops/event-control/types";
import { RV_CHRONOLOGY_DEFAULT_YEAR, rvYearHref } from "@/lib/rv/rv-chronology-paths";
import { artistPublicHrefFromName, trackPageHref } from "@/lib/search/entity-routes";
import { discoveryShelf } from "@/lib/public/discovery-contract";

type Props = {
  initial: PublicHomepagePayload;
  hero: HomepageHero | null;
  featuredExperience: {
    title: string;
    subtitle: string;
    href: string | null;
    coverUrl: string | null;
  } | null;
};

type PanelModel = {
  key: string;
  label: string;
  title: string;
  subtitle: string;
  href: string | null;
  externalHref: string | null;
  coverUrl: string | null;
};

const DEFAULT_POLL_MS = 7000;
const CHANNEL_POLL_MS = 3000;
const RE_RVTR = /^RVTR\d{6}$/i;

function externalSongSearch(artist: string, title: string): string | null {
  return externalSearchHref("youtube", externalDiscoveryQuery({ entityType: "song", artist, title }));
}

type HomepageIdentity = {
  title: string | null;
  artist: string | null;
  album: string | null;
  year: number | null;
  coverUrl: string | null;
  rvtr: string | null;
  songHref: string | null;
  artistHref: string | null;
  albumHref: string | null;
  yearHref: string | null;
  hasPresentation: boolean;
};

function extractHomepageIdentity(payload: PublicHomepagePayload): HomepageIdentity {
  const song = payload.publicSong;
  const track = payload.track ?? song?.track ?? null;
  const live = payload.live;
  const rvba = payload.manualOverride?.rvba;

  const title =
    song?.title?.trim() ||
    track?.title?.trim() ||
    live?.title?.trim() ||
    rvba?.title?.trim() ||
    null;
  const artist =
    song?.artist?.trim() ||
    track?.artistName?.trim() ||
    live?.artist?.trim() ||
    rvba?.subtitle?.trim() ||
    null;
  const album = song?.album ?? track?.primaryAlbum?.title ?? null;
  const year = song?.year ?? track?.releaseYear ?? live?.year ?? null;
  const coverUrl = song?.coverUrl ?? track?.coverUrl ?? live?.coverUrl ?? null;

  const rawId = payload.currentTrackId?.trim() ?? song?.rvtr ?? track?.rvtr ?? live?.rvtr ?? null;
  const rvtr =
    rawId && RE_RVTR.test(rawId)
      ? rawId.toUpperCase()
      : song?.rvtr ?? track?.rvtr ?? live?.rvtr ?? null;

  const destinationHref =
    payload.destination?.href && payload.destination.href !== "/" ? payload.destination.href : null;
  const songHref =
    rvtr && RE_RVTR.test(rvtr)
      ? trackPageHref(rvtr)
      : destinationHref ?? (title && artist ? `/search?q=${encodeURIComponent(`${artist} ${title}`)}` : null);
  const artistHref =
    track?.artistHref ?? song?.links.artistHref ?? (artist ? artistPublicHrefFromName(artist) : null);
  const albumHref = track?.primaryAlbum?.href ?? song?.links.albumHref ?? null;
  const yearHref = track?.rvYearHref ?? song?.links.yearHref ?? (year ? rvYearHref(year) : null);

  return {
    title,
    artist,
    album,
    year,
    coverUrl,
    rvtr,
    songHref,
    artistHref,
    albumHref,
    yearHref,
    hasPresentation: Boolean(title && artist),
  };
}

function buildIdlePanels(
  featuredExperience: Props["featuredExperience"],
  hero: HomepageHero | null,
): PanelModel[] {
  return [
    {
      key: "song",
      label: "Song",
      title: "Nothing on air",
      subtitle: "Search the archive",
      href: "/search",
      externalHref: null,
      coverUrl: null,
    },
    {
      key: "artist",
      label: "Artist",
      title: "Discover artists",
      subtitle: "Browse by name",
      href: "/search",
      externalHref: null,
      coverUrl: null,
    },
    {
      key: "album",
      label: "Album",
      title: "Explore albums",
      subtitle: "Album pages in Retroverse",
      href: "/search",
      externalHref: null,
      coverUrl: null,
    },
    {
      key: "year",
      label: "Year",
      title: "Explore years",
      subtitle: "Chart chronology",
      href: "/retroverse-2/charts",
      externalHref: externalSearchHref(
        "youtube",
        externalDiscoveryQuery({ entityType: "year", year: RV_CHRONOLOGY_DEFAULT_YEAR }),
      ),
      coverUrl: null,
    },
    {
      key: "featured",
      label: "Featured Experience",
      title: featuredExperience?.title ?? "Featured song journey",
      subtitle: featuredExperience?.subtitle ?? "Open a song experience",
      href: featuredExperience?.href ?? "/search",
      externalHref: null,
      coverUrl: featuredExperience?.coverUrl ?? null,
    },
    {
      key: "event",
      label: "Event or Action",
      title: hero?.headline ?? "Retroverse Live",
      subtitle: hero?.subheadline ?? hero?.description ?? "Press Play for the Past",
      href: hero?.ctaLink ?? "/search",
      externalHref: null,
      coverUrl: hero?.featureImageUrl ?? null,
    },
  ];
}

function buildPanels(
  payload: PublicHomepagePayload,
  featuredExperience: Props["featuredExperience"],
  hero: HomepageHero | null,
): PanelModel[] {
  const identity = extractHomepageIdentity(payload);
  if (!identity.hasPresentation) {
    return buildIdlePanels(featuredExperience, hero);
  }

  const { title, artist, album, year, coverUrl, songHref, artistHref, albumHref, yearHref } = identity;
  const resolvedTitle = title!;
  const resolvedArtist = artist!;

  const songExternal = externalSongSearch(resolvedArtist, resolvedTitle);
  const artistExternal = externalSearchHref(
    "youtube",
    externalDiscoveryQuery({ entityType: "artist", artist: resolvedArtist }),
  );
  const albumExternal = album
    ? externalSearchHref(
        "youtube",
        externalDiscoveryQuery({ entityType: "album", artist: resolvedArtist, album }),
      )
    : null;
  const yearExternal = year
    ? externalSearchHref("youtube", externalDiscoveryQuery({ entityType: "year", year }))
    : null;

  return [
    {
      key: "song",
      label: "Song",
      title: resolvedTitle,
      subtitle: resolvedArtist,
      href: songHref,
      externalHref: songHref ? null : songExternal,
      coverUrl,
    },
    {
      key: "artist",
      label: "Artist",
      title: resolvedArtist,
      subtitle: year ? `Active in ${year}` : "Artist",
      href: artistHref,
      externalHref: artistHref ? null : artistExternal,
      coverUrl,
    },
    {
      key: "album",
      label: "Album",
      title: album ?? "Album unavailable",
      subtitle: album ? resolvedArtist : "Search externally",
      href: albumHref,
      externalHref: albumHref ? null : albumExternal ?? externalSearchHref(
        "youtube",
        externalDiscoveryQuery({ entityType: "album", artist: resolvedArtist, album: album ?? undefined }),
      ),
      coverUrl,
    },
    {
      key: "year",
      label: "Year",
      title: year ? String(year) : "Year unavailable",
      subtitle: year ? "Chart chronology" : "Browse chart years",
      href: yearHref ?? "/retroverse-2/charts",
      externalHref: yearHref
        ? null
        : yearExternal ??
          externalSearchHref(
            "youtube",
            externalDiscoveryQuery({ entityType: "year", year: year ?? RV_CHRONOLOGY_DEFAULT_YEAR }),
          ),
      coverUrl: null,
    },
    {
      key: "featured",
      label: "Featured Experience",
      title: featuredExperience?.title ?? resolvedTitle,
      subtitle: featuredExperience?.subtitle ?? resolvedArtist,
      href: featuredExperience?.href ?? songHref,
      externalHref: featuredExperience?.href || songHref ? null : songExternal,
      coverUrl: featuredExperience?.coverUrl ?? coverUrl,
    },
    {
      key: "event",
      label: "Event or Action",
      title: hero?.headline ?? "Retroverse Live",
      subtitle: hero?.subheadline ?? hero?.description ?? "Press Play for the Past",
      href: hero?.ctaLink ?? "/search",
      externalHref: null,
      coverUrl: hero?.featureImageUrl ?? null,
    },
  ];
}

function HomepagePanel({ panel }: { panel: PanelModel }) {
  const destination = panel.href ?? panel.externalHref;
  const external = !panel.href && panel.externalHref;

  const body = (
    <>
      {panel.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={panel.coverUrl} alt="" className="public-home__panel-art" loading="lazy" />
      ) : (
        <div className="public-home__panel-art public-home__panel-art--fallback" aria-hidden>
          {panel.label.slice(0, 1)}
        </div>
      )}
      <p className="public-home__panel-kicker">{panel.label}</p>
      <h2 className="public-home__panel-title">{panel.title}</h2>
      <p className="public-home__panel-sub">{panel.subtitle}</p>
      {external ? <span className="public-home__panel-external">Search externally ↗</span> : null}
    </>
  );

  if (!destination) {
    return (
      <article className="public-home__panel public-home__panel--static" aria-label={panel.label}>
        {body}
      </article>
    );
  }

  if (external) {
    return (
      <a
        href={destination}
        className="public-home__panel"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${panel.label}: search externally`}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={destination} prefetch className="public-home__panel" aria-label={panel.label}>
      {body}
    </Link>
  );
}

export function PublicHomepageView({ initial, hero, featuredExperience }: Props) {
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
        const data = (await res.json()) as PublicHomepagePayload;
        if (cancelled || data.publicState?.version !== 2) return;
        setPayload(data);
      } catch {
        /* keep last good payload */
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
    Boolean(payload.manualOverride?.rvba?.title?.trim()) ||
    (payload.live?.source === "bridge" && Boolean(payload.live?.title?.trim())) ||
    payload.live?.source === "channel" ||
    payload.channel?.running === true;

  const panels = useMemo(
    () => buildPanels(payload, featuredExperience, hero),
    [payload, featuredExperience, hero],
  );

  return (
    <Rv2PublicShell
      className="public-home rv2-live-home"
      activeNav="live"
      yearsHref={panels.find((panel) => panel.key === "year")?.href ?? rvYearHref(RV_CHRONOLOGY_DEFAULT_YEAR)}
      minimalNavigation
    >
      <div className="public-home__board">
        <header className="public-home__header">
          <p className="public-home__kicker">
            {isLiveNow ? "Live Now" : discoveryShelf("homeCurrentSong").displayLabel}
          </p>
          <h1 className="public-home__title">Retroverse</h1>
          <p className="public-home__tagline">Press Play for the Past</p>
        </header>

        <section className="public-home__search" aria-label="Search Retroverse">
          <HomeSearchInput />
        </section>

        {hero ? (
          <section className="public-home__headline" aria-label="Announcement">
            <p className="public-home__headline-kicker">{hero.featureLabel}</p>
            <p className="public-home__headline-text">{hero.headline}</p>
            {hero.subheadline ? <p className="public-home__headline-sub">{hero.subheadline}</p> : null}
          </section>
        ) : null}

        <section className="public-home__panels" aria-label="Explore current song">
          {panels.map((panel) => (
            <HomepagePanel key={panel.key} panel={panel} />
          ))}
        </section>
      </div>
    </Rv2PublicShell>
  );
}
