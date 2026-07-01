import type { HomeFeaturedYear } from "@/lib/home/home-featured-years";
import type { HomeNowPlaying } from "@/lib/home/homepage-types";

export type EventHomepageGiveaway = {
  eventKey: string;
  giveawayId: string;
  prizeTitle: string;
  prizeDescription: string;
  heroImageUrl: string | null;
  registrationUrl: string;
  registerLabel: string;
};

export type EventHomepageData = {
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  heroImageUrl: string;
  registerCtaHref: string;
  registerCtaLabel: string;
  nowPlaying: HomeNowPlaying | null;
  giveaway: EventHomepageGiveaway;
  featuredYears: HomeFeaturedYear[];
};
