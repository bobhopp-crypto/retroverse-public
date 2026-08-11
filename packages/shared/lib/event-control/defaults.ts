import type { EventControlConfig } from "./types";

export const DEFAULT_FEATURED_YEARS = [1967, 1978, 1992] as const;

export const DEFAULT_RVBR: EventControlConfig["rvbr"] = {
  eyebrow: null,
  issueTheme: null,
  issueNumber: null,
  issueColor: "DEFAULT",
  tagline: null,
};

export const DEFAULT_EVENT_CONTROL_CONFIG: EventControlConfig = {
  version: 3,
  event: {
    title: "Sunday Nights",
    venue: "",
    date: "",
    active: false,
  },
  featuredYears: [...DEFAULT_FEATURED_YEARS],
  homepage: {
    headline: null,
    subheadline: null,
    mode: "YEARS",
    ctaLabel: null,
    ctaLink: null,
    featureImageUrl: null,
    featureDescription: null,
    heroYear: 1967,
    featuredArtist: null,
    featuredArtistSlug: null,
    heroOverride: null,
    panelA: null,
    panelB: null,
    chyronOverride: null,
    idleChyron: null,
    requests: {
      enabled: true,
      sourceKey: null,
      sourceLabel: null,
      guestSearch: true,
      hidePlayed: false,
      featuredKeys: [],
    },
    requestProgrammingByEvent: {},
  },
  rvbr: { ...DEFAULT_RVBR },
  updatedAt: "1970-01-01T00:00:00.000Z",
};
