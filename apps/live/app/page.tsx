import type { Metadata } from "next";

import { PublicHomepageView } from "@/app/components/public-homepage-view";
import { loadFeaturedYearCovers } from "@/lib/home/load-featured-year-covers";
import { loadHomepageDocument } from "@/lib/home/load-homepage-document";
import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";
import { resolveHomepageRotationRvtr } from "@/lib/home/homepage-rvtr";
import { buildHomepageHero } from "@/lib/ops/event-control/homepage-hero";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { trackPageHref } from "@/lib/search/entity-routes";
import { loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";

import "@/app/retroverse-2/live/retroverse-live-2.css";
import "@/app/live-home.css";
import "@/app/public-homepage.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/** retroverse.live — fixed six-panel homepage; current song drives the first four panels. */
export default async function HomePage() {
  void loadFeaturedYearCovers();

  const [initial, eventConfig, rotationRvtr] = await Promise.all([
    loadPublicCurrentSongPayload(),
    loadEventControlConfig().catch(() => null),
    resolveHomepageRotationRvtr(),
  ]);

  const hero = eventConfig ? buildHomepageHero(eventConfig) : null;

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

  return (
    <PublicHomepageView
      initial={initial}
      hero={hero}
      featuredExperience={featuredExperience}
    />
  );
}
