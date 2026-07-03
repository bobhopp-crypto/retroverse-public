import "server-only";

import { buildFeaturedYearsFromConfig } from "@/lib/ops/event-control/featured-years";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";
import { getActiveProducerPlan } from "@/lib/ops/event-studio/producer/producer-state";
import {
  EVENT_HOMEPAGE_GIVEAWAY,
  EVENT_HOMEPAGE_HERO_IMAGE,
} from "@/lib/home/event-homepage-copy";
import type { EventHomepageData } from "@/lib/home/event-homepage-types";
import { loadBridgeNowPlaying } from "@/lib/home/load-homepage-data";
import { liveSongExperienceHref } from "@/lib/live-control/experience-route";

export type EventStudioHomepagePreview = EventHomepageData & {
  publicUrl: string;
  editorialPlaceholder: {
    eyebrow: string;
    headline: string;
    paragraphs: string[];
  };
  nowPlayingPlaceholder: string;
};

export async function loadEventStudioHomepagePreview(): Promise<EventStudioHomepagePreview> {
  const [activePlan, eventConfig, giveawaySnapshot, nowPlaying] = await Promise.all([
    getActiveProducerPlan(),
    loadEventControlConfig().catch(() => null),
    loadGiveawayStudio().catch(() => null),
    loadBridgeNowPlaying().catch(() => null),
  ]);

  const plan = activePlan?.parsedPlan ?? null;

  const eventTitle =
    plan?.eventTitle.trim() ||
    eventConfig?.event.title.trim() ||
    "Live Aid";
  const eventDate =
    plan?.dateSummary.trim() ||
    plan?.dates.join(", ") ||
    eventConfig?.event.date.trim() ||
    "July Sundays";
  const eventVenue =
    plan?.venue.trim() ||
    eventConfig?.event.venue.trim() ||
    "The Main Pub";
  const theme = plan?.theme.trim() || eventConfig?.rvbr.issueTheme?.trim() || "1980s Night";

  const heroImageUrl =
    eventConfig?.homepage.featureImageUrl?.trim() || EVENT_HOMEPAGE_HERO_IMAGE;

  const activeGiveaway = giveawaySnapshot?.activeGiveaway;
  const eventKey = activeGiveaway?.eventKey ?? slugifyEventKey(eventTitle);
  const giveawayId = activeGiveaway?.id ?? `gw_${slugifyEventKey(eventKey)}_primary`;
  const registrationUrl =
    giveawaySnapshot?.registrationUrl ??
    `/giveaway/${encodeURIComponent(eventKey)}?g=${encodeURIComponent(giveawayId)}`;

  const prizeTitle =
    activeGiveaway?.prize.title.trim() ||
    plan?.giveaway.prize.trim() ||
    EVENT_HOMEPAGE_GIVEAWAY.prizeTitle;
  const prizeDescription =
    activeGiveaway?.prize.description.trim() ||
    plan?.giveaway.rules.trim() ||
    EVENT_HOMEPAGE_GIVEAWAY.prizeDescription;

  const featuredYears =
    eventConfig && eventConfig.featuredYears.length >= 3
      ? buildFeaturedYearsFromConfig(eventConfig)
      : (plan?.musicEra.length
          ? plan.musicEra.map((era) => ({
              year: 1980,
              href: "/rv/1980",
              descriptor: era,
            }))
          : [{ year: 1980, href: "/rv/1980", descriptor: "Live Aid · Arena Rock · MTV Era" }]);

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
      heroImageUrl: activeGiveaway?.prize.heroImageUrl ?? EVENT_HOMEPAGE_GIVEAWAY.heroImageUrl,
      registrationUrl,
      registerLabel: EVENT_HOMEPAGE_GIVEAWAY.registerLabel,
    },
    featuredYears,
    publicUrl: "/",
    editorialPlaceholder: {
      eyebrow: "Editorial",
      headline: theme,
      paragraphs: [
        "Editorial section placeholder — Sunday show copy comes from the Producer plan.",
        plan?.seriesName.trim()
          ? `${plan.seriesName} at ${eventVenue}.`
          : `${eventTitle} at ${eventVenue} — ${eventDate}.`,
      ],
    },
    nowPlayingPlaceholder: resolvedNowPlaying
      ? "Now Playing is live from the bridge."
      : "Now Playing placeholder — goes live when the show starts.",
  };
}
