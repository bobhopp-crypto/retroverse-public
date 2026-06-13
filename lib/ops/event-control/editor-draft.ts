import { DEFAULT_EVENT_CONTROL_CONFIG } from "./defaults";
import { buildFeaturedYearsFromConfig } from "./featured-years";
import { buildHomepageHero, yearsSectionLabel } from "./homepage-hero";
import type { EventControlConfig, EventControlSavePayload, RvbrIssueColor } from "./types";

/** Simplified homepage editor — 12 fields (cover image restored). */
export type HomepageEditorDraft = {
  showCover: boolean;
  headline: string;
  eyebrow: string;
  description: string;
  coverImageUrl: string;
  ctaLabel: string;
  ctaLink: string;
  tagline: string;
  issueColor: RvbrIssueColor;
  years: [number, number, number];
};

export function editorDraftFromConfig(config: EventControlConfig): HomepageEditorDraft {
  const years = config.featuredYears.slice(0, 3);
  while (years.length < 3) {
    years.push(DEFAULT_EVENT_CONTROL_CONFIG.featuredYears[years.length] ?? 1967);
  }

  return {
    showCover: config.event.active,
    headline: (config.homepage.headline ?? config.event.title ?? "").trim(),
    eyebrow: (config.rvbr.eyebrow ?? config.rvbr.issueTheme ?? "").trim(),
    description: (config.homepage.featureDescription ?? "").trim(),
    coverImageUrl: (config.homepage.featureImageUrl ?? "").trim(),
    ctaLabel: (config.homepage.ctaLabel ?? "").trim(),
    ctaLink: (config.homepage.ctaLink ?? "").trim(),
    tagline: (config.rvbr.tagline ?? "").trim(),
    issueColor: config.rvbr.issueColor,
    years: [years[0]!, years[1]!, years[2]!],
  };
}

export function configFromEditorDraft(
  draft: HomepageEditorDraft,
  preserved?: EventControlConfig,
): EventControlConfig {
  const base = preserved ?? DEFAULT_EVENT_CONTROL_CONFIG;
  const headline = draft.headline.trim();

  const payload: EventControlSavePayload = {
    event: {
      title: headline || base.event.title,
      venue: base.event.venue,
      date: base.event.date,
      active: draft.showCover,
    },
    featuredYears: [...draft.years],
    homepage: {
      headline: headline || null,
      subheadline: base.homepage.subheadline,
      mode: draft.showCover ? "EVENT" : "YEARS",
      ctaLabel: draft.ctaLabel.trim() || null,
      ctaLink: draft.ctaLink.trim() || null,
      featureImageUrl: draft.coverImageUrl.trim() || null,
      featureDescription: draft.description.trim() || null,
      heroYear: draft.years[0] ?? null,
      featuredArtist: base.homepage.featuredArtist,
      featuredArtistSlug: base.homepage.featuredArtistSlug,
    },
    rvbr: {
      eyebrow: draft.eyebrow.trim() || null,
      issueTheme: draft.eyebrow.trim() || base.rvbr.issueTheme,
      issueNumber: base.rvbr.issueNumber,
      issueColor: draft.issueColor,
      tagline: draft.tagline.trim() || null,
    },
  };

  return {
    version: 3,
    ...payload,
    updatedAt: base.updatedAt,
  };
}

export function savePayloadFromEditorDraft(
  draft: HomepageEditorDraft,
  preserved?: EventControlConfig,
): EventControlSavePayload {
  const config = configFromEditorDraft(draft, preserved);
  return {
    event: config.event,
    featuredYears: config.featuredYears,
    homepage: config.homepage,
    rvbr: config.rvbr,
  };
}

export function buildHomepagePreviewProps(draft: HomepageEditorDraft, preserved?: EventControlConfig) {
  const config = configFromEditorDraft(draft, preserved);
  const hero = buildHomepageHero(config);
  const featuredYears = buildFeaturedYearsFromConfig(config);
  const yearsLabel = yearsSectionLabel(config.homepage.mode, hero != null);
  return { config, hero, featuredYears, yearsLabel };
}
