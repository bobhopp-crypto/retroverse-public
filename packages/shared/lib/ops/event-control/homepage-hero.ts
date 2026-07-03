import { issueColorClass } from "./rvbr-palette";
import type { EventControlConfig, HomepageHero, HomepageMode } from "./types";

const MODE_FEATURE_LABELS: Record<HomepageMode, string> = {
  YEARS: "A Retroverse Feature",
  EVENT: "A Retroverse Feature",
  COLLECTION: "This Week's Collection",
  CUSTOM: "Current Issue",
};

function resolveMode(raw: unknown, eventActive: boolean): HomepageMode {
  if (raw === "YEARS" || raw === "EVENT" || raw === "COLLECTION" || raw === "CUSTOM") {
    return raw;
  }
  return eventActive ? "EVENT" : "YEARS";
}

export function resolveHomepageMode(config: EventControlConfig): HomepageMode {
  return resolveMode(config.homepage.mode, config.event.active);
}

function buildMasthead(config: EventControlConfig): string {
  const number = config.rvbr.issueNumber?.trim();
  if (number) return `Retroverse Issue · No. ${number}`;
  return "From the Living Music Archive";
}

/** Cover-story hero block — null when inactive or empty. */
export function buildHomepageHero(config: EventControlConfig): HomepageHero | null {
  if (!config.event.active) return null;

  const headline = (config.homepage.headline ?? config.event.title).trim();
  const subheadline = config.homepage.subheadline?.trim() || null;
  const venue = config.event.venue.trim() || null;
  const date = config.event.date.trim() || null;
  const description = config.homepage.featureDescription?.trim() || null;
  const ctaLabel = config.homepage.ctaLabel?.trim() || null;
  const ctaLink = config.homepage.ctaLink?.trim() || null;
  const featureImageUrl = config.homepage.featureImageUrl?.trim() || null;
  const featuredArtist = config.homepage.featuredArtist?.trim() || null;
  const featuredArtistSlug = config.homepage.featuredArtistSlug?.trim() || null;
  const eyebrow = config.rvbr.eyebrow?.trim() || config.rvbr.issueTheme?.trim() || null;
  const issueTheme = config.rvbr.issueTheme?.trim() || null;
  const issueNumber = config.rvbr.issueNumber?.trim() || null;
  const tagline = config.rvbr.tagline?.trim() || null;
  const mode = resolveHomepageMode(config);
  const issueColor = config.rvbr.issueColor;

  const hasContent =
    headline ||
    subheadline ||
    venue ||
    date ||
    description ||
    ctaLabel ||
    featureImageUrl ||
    featuredArtist ||
    eyebrow ||
    tagline;

  if (!hasContent) return null;

  return {
    masthead: buildMasthead(config),
    featureLabel: MODE_FEATURE_LABELS[mode],
    eyebrow,
    issueTheme,
    issueNumber,
    headline: headline || "Retroverse",
    subheadline,
    venue,
    date,
    description,
    ctaLabel,
    ctaLink,
    tagline,
    featureImageUrl,
    featuredArtist,
    featuredArtistSlug,
    mode,
    issueColor,
    issueColorClass: issueColorClass(issueColor),
  };
}

export function yearsSectionLabel(mode: HomepageMode, hasHero: boolean): string {
  if (hasHero) {
    switch (mode) {
      case "COLLECTION":
        return "Explore the era";
      case "CUSTOM":
        return "Also in this issue";
      default:
        return "Explore the years";
    }
  }
  switch (mode) {
    case "COLLECTION":
      return "Explore the era";
    case "CUSTOM":
      return "Also explore";
    case "EVENT":
      return "Featured years";
    default:
      return "Start with a year";
  }
}
