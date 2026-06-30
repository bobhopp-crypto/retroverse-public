import "server-only";

import { cache } from "react";

import { buildFeaturedYearsFromConfig } from "@/lib/ops/event-control/featured-years";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { loadGiveawayStudioByEventKey } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import { liveSongExperienceHref } from "@/lib/live-control/experience-route";

import {
  EVENT_HOMEPAGE_EDITORIAL,
  EVENT_HOMEPAGE_EVENT,
  EVENT_HOMEPAGE_FEATURED_YEARS,
  EVENT_HOMEPAGE_GIVEAWAY,
  EVENT_HOMEPAGE_HERO_IMAGE,
} from "./event-homepage-copy";
import type { EventHomepageData } from "./event-homepage-types";
import { loadBridgeNowPlaying } from "./load-homepage-data";

function resolveFeaturedYears(): EventHomepageData["featuredYears"] {
  const years = [...EVENT_HOMEPAGE_FEATURED_YEARS];
  return years.map((year) => ({
    year,
    href: `/rv/${year}`,
    descriptor:
      year === 1967
        ? "Summer of Love · British Invasion · Psychedelia"
        : year === 1978
          ? "Disco · Arena Rock · New Wave"
          : "Grunge · Hip-Hop · MTV Era",
  }));
}

export const loadEventHomepageData = cache(async (): Promise<EventHomepageData> => {
  const [nowPlaying, eventConfig, giveawaySnapshot] = await Promise.all([
    loadBridgeNowPlaying(),
    loadEventControlConfig().catch(() => null),
    loadGiveawayStudioByEventKey(EVENT_HOMEPAGE_EVENT.eventKey).catch(() => null),
  ]);

  const eventTitle = eventConfig?.event.title?.trim() || EVENT_HOMEPAGE_EVENT.title;
  const eventDate = eventConfig?.event.date?.trim() || EVENT_HOMEPAGE_EVENT.date;
  const eventVenue = eventConfig?.event.venue?.trim() || EVENT_HOMEPAGE_EVENT.venue;

  const heroImageUrl =
    eventConfig?.homepage.featureImageUrl?.trim() || EVENT_HOMEPAGE_HERO_IMAGE;

  const activeGiveaway = giveawaySnapshot?.activeGiveaway;
  const eventKey = activeGiveaway?.eventKey ?? EVENT_HOMEPAGE_EVENT.eventKey;
  const giveawayId = activeGiveaway?.id ?? `gw_${slugifyEventKey(eventKey)}_primary`;
  const registrationUrl =
    giveawaySnapshot?.registrationUrl ??
    `/giveaway/${encodeURIComponent(eventKey)}?g=${encodeURIComponent(giveawayId)}`;

  const studioPrizeTitle = activeGiveaway?.prize.title?.trim() ?? "";
  const useStudioPrize =
    studioPrizeTitle.length > 0 &&
    !studioPrizeTitle.toLowerCase().includes("collector display");

  const prizeTitle = useStudioPrize ? studioPrizeTitle : EVENT_HOMEPAGE_GIVEAWAY.prizeTitle;
  const prizeDescription = useStudioPrize
    ? activeGiveaway!.prize.description
    : EVENT_HOMEPAGE_GIVEAWAY.prizeDescription;
  const prizeImageUrl = useStudioPrize
    ? activeGiveaway!.prize.heroImageUrl ?? EVENT_HOMEPAGE_GIVEAWAY.heroImageUrl
    : EVENT_HOMEPAGE_GIVEAWAY.heroImageUrl;

  const featuredYearsFromConfig =
    eventConfig && eventConfig.featuredYears.length >= 3
      ? buildFeaturedYearsFromConfig(eventConfig)
      : resolveFeaturedYears();

  const resolvedNowPlaying = nowPlaying
    ? {
        ...nowPlaying,
        liveHref: nowPlaying.rvtr
          ? liveSongExperienceHref(nowPlaying.rvtr)
          : nowPlaying.liveHref,
      }
    : null;

  return {
    eventTitle,
    eventDate,
    eventVenue,
    heroImageUrl,
    registerCtaHref: registrationUrl,
    registerCtaLabel: EVENT_HOMEPAGE_GIVEAWAY.registerLabel,
    nowPlaying: resolvedNowPlaying,
    giveaway: {
      eventKey,
      giveawayId,
      prizeTitle,
      prizeDescription,
      heroImageUrl: prizeImageUrl,
      registrationUrl,
      registerLabel: EVENT_HOMEPAGE_GIVEAWAY.registerLabel,
    },
    featuredYears: featuredYearsFromConfig,
  };
});

export { EVENT_HOMEPAGE_EDITORIAL, EVENT_HOMEPAGE_NEXT_EVENT } from "./event-homepage-copy";
