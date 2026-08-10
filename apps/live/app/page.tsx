import type { Metadata } from "next";

import { PublicHomepageView } from "@/app/components/public-homepage-view";
import { LiveSongView } from "@/app/components/live-song-view";
import { loadFeaturedYearCovers } from "@/lib/home/load-featured-year-covers";
import { loadHomepageDocument } from "@/lib/home/load-homepage-document";
import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";
import { resolveHomepageAuthority } from "@/lib/homepage-authority";
import { resolveHomepageRotationRvtr } from "@/lib/home/homepage-rvtr";
import { buildHomepageHero } from "@/lib/event-control/homepage-hero";
import { loadEventControlConfig } from "@/lib/event-control/store";
import { artistPublicHrefFromName, trackPageHref } from "@/lib/search/entity-routes";
import { rvYearHref } from "@/lib/rv/rv-chronology-paths";
import { loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import { resolveHomepageMagazineModel } from "./homepage-magazine-model";

import "@/app/retroverse-2/live/retroverse-live-2.css";
import "@/app/live-home.css";
import "@/app/public-homepage.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Now Playing",
  description: "The song playing right now.",
};

/** retroverse.live — preserves programmed experiences and uses a focused live-song surface for VDJ songs. */
export default async function HomePage() {
  void loadFeaturedYearCovers();

  const [initial, eventConfig, rotationRvtr] = await Promise.all([
    loadPublicCurrentSongPayload(),
    loadEventControlConfig().catch(() => null),
    resolveHomepageRotationRvtr(),
  ]);

  const authority = resolveHomepageAuthority({
    currentSong: initial,
    automaticHero: eventConfig ? buildHomepageHero(eventConfig) : null,
    overrides: eventConfig
      ? {
          hero: eventConfig.homepage.heroOverride,
          panelA: eventConfig.homepage.panelA,
          panelB: eventConfig.homepage.panelB,
          chyron: eventConfig.homepage.chyronOverride,
        }
      : undefined,
  });

  const featuredRvtr =
    initial.publicSong?.rvtr ??
    (initial.currentTrackId?.match(/^RVTR\d{6}$/i) ? initial.currentTrackId.toUpperCase() : null) ??
    rotationRvtr;

  const featuredDocument = featuredRvtr ? await loadHomepageDocument(featuredRvtr).catch(() => null) : null;
  const featuredPayload = featuredRvtr ? await loadPublicSongPayload(featuredRvtr).catch(() => null) : null;

  const featuredExperience = featuredDocument
    ? {
        title: featuredDocument.title,
        subtitle: featuredDocument.artist,
        href: trackPageHref(featuredDocument.rvtr),
        coverUrl: featuredDocument.coverUrl ?? featuredDocument.heroUrl ?? null,
      }
    : featuredPayload
      ? {
          title: featuredPayload.title,
          subtitle: featuredPayload.artist,
          href: featuredPayload.links.songHref,
          coverUrl: featuredPayload.coverUrl,
        }
      : null;

  const magazine = featuredRvtr ? await resolveHomepageMagazineModel(featuredRvtr, initial.channel?.running || initial.live?.source === "channel" ? "Live now" : "Archive selection") : null;

  const isNormalLiveSong =
    !initial.manualOverride &&
    Boolean(initial.live?.title?.trim() && initial.live?.artist?.trim()) &&
    (initial.live?.source === "bridge" || initial.live?.source === "channel");

  if (isNormalLiveSong) {
    return <LiveSongView payload={initial} heroUrl={featuredDocument?.heroUrl ?? null} heroRvtr={featuredRvtr} />;
  }

  return (
    <PublicHomepageView
      initial={initial}
      hero={authority.hero}
      panelA={authority.panelA}
      panelB={authority.panelB}
      chyron={authority.chyron}
      idleChyron={eventConfig?.homepage.idleChyron ?? ""}
      featuredExperience={featuredExperience}
      magazine={magazine}
    />
  );
}
