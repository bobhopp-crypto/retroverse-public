/** Editable homepage event programming — ops-driven, no redeploy. */

export type HomepageMode = "YEARS" | "EVENT" | "COLLECTION" | "CUSTOM";

export type RvbrIssueColor = "DEFAULT" | "1960s" | "1970s" | "1980s" | "1990s" | "2000s";

export type EventControlRvbr = {
  eyebrow: string | null;
  issueTheme: string | null;
  issueNumber: string | null;
  issueColor: RvbrIssueColor;
  tagline: string | null;
};

export type EventControlEvent = {
  title: string;
  venue: string;
  date: string;
  active: boolean;
};

export type EventControlHomepage = {
  headline: string | null;
  subheadline: string | null;
  mode: HomepageMode;
  ctaLabel: string | null;
  ctaLink: string | null;
  featureImageUrl: string | null;
  featureDescription: string | null;
  heroYear: number | null;
  featuredArtist: string | null;
  featuredArtistSlug: string | null;
  heroOverride: HomepageHero | null;
  panelA: EventHomepagePanel | null;
  panelB: EventHomepagePanel | null;
  chyronOverride: string | null;
  idleChyron: string | null;
  requests: EventRequestProgramming;
  requestProgrammingByEvent: Record<string, EventRequestProgramming>;
};

export type EventRequestProgramming = {
  enabled: boolean;
  sourceKey: string | null;
  sourceLabel: string | null;
  guestSearch: boolean;
  hidePlayed: boolean;
  featuredKeys: string[];
};

export type EventHomepagePanel = {
  id: string;
  label: string;
  title: string;
  message?: string | null;
  actionLabel?: string | null;
  href: string | null;
};

export type EventControlConfig = {
  version: 2 | 3;
  event: EventControlEvent;
  /** Three required featured years; optional fourth when length is 4. */
  featuredYears: number[];
  homepage: EventControlHomepage;
  rvbr: EventControlRvbr;
  updatedAt: string;
};

export type EventControlSavePayload = {
  event: EventControlEvent;
  featuredYears: number[];
  homepage: EventControlHomepage;
  rvbr: EventControlRvbr;
};

export type HomepageHero = {
  masthead: string;
  featureLabel: string;
  eyebrow: string | null;
  issueTheme: string | null;
  issueNumber: string | null;
  headline: string;
  subheadline: string | null;
  venue: string | null;
  date: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  tagline: string | null;
  featureImageUrl: string | null;
  featuredArtist: string | null;
  featuredArtistSlug: string | null;
  mode: HomepageMode;
  issueColor: RvbrIssueColor;
  issueColorClass: string;
};
