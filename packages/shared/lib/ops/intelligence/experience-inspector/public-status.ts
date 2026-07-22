/**
 * RV04-03 Song Workspace — public status + public navigation links.
 * Derived only from inventory section statuses. No AI.
 */

import { publicSiteBaseUrl } from "@/lib/bobos/presentation/push-public";
import { rvYearHref } from "@/lib/rv/rv-chronology-paths";
import { trackPageHref } from "@/lib/search/entity-routes";

import type { ExperienceInventory, ExperienceInventorySection } from "./types";

export type PublicStatusFlag = {
  id: string;
  label: string;
  ready: boolean;
  explanation: string;
};

export type PublicNavLink = {
  id: string;
  label: string;
  href: string | null;
};

function section(
  sections: ExperienceInventorySection[],
  id: string,
): ExperienceInventorySection | undefined {
  return sections.find((item) => item.id === id);
}

function isAvailable(sections: ExperienceInventorySection[], id: string): boolean {
  return section(sections, id)?.status === "available";
}

/** Compact public readiness flags from inventory only. */
export function derivePublicStatus(
  inventory: ExperienceInventory,
): PublicStatusFlag[] {
  const { sections } = inventory;
  const pageReady = isAvailable(sections, "public-song-payload");
  const published =
    isAvailable(sections, "public-experience") ||
    isAvailable(sections, "public-exhibit");
  const packageReady =
    isAvailable(sections, "song-package") ||
    isAvailable(sections, "universal-package");
  const broadcastReady =
    isAvailable(sections, "now-playing-package") &&
    isAvailable(sections, "publisher-record") &&
    isAvailable(sections, "artifact-readiness");
  const searchIndexed = pageReady;

  return [
    {
      id: "public-page",
      label: "Public Page Ready",
      ready: pageReady,
      explanation: pageReady
        ? "Public song payload (loadTrackPage) is available."
        : "Public song payload is missing.",
    },
    {
      id: "published",
      label: "Published",
      ready: published,
      explanation: published
        ? "Public exhibit or published experience is available."
        : "No published exhibit/experience payload.",
    },
    {
      id: "package",
      label: "Package Ready",
      ready: packageReady,
      explanation: packageReady
        ? "Song package or universal package is available."
        : "No song/universal package.",
    },
    {
      id: "broadcast",
      label: "Broadcast Ready",
      ready: broadcastReady,
      explanation: broadcastReady
        ? "Now-playing, publisher, and artifact readiness are available."
        : "Broadcast package sections are incomplete.",
    },
    {
      id: "search",
      label: "Search Indexed",
      ready: searchIndexed,
      explanation: searchIndexed
        ? "Canonical public song payload is available for discovery."
        : "Public song payload missing — not search-ready.",
    },
  ];
}

export type PublicNavModel = {
  links: PublicNavLink[];
  songHref: string | null;
  artistHref: string | null;
  albumHref: string | null;
  yearHref: string | null;
  chartsHref: string;
};

/**
 * Absolute public Retroverse URLs for Open Song / Artist / Album / Year / Charts.
 * Paths come from the same public track page model when available.
 */
export function buildPublicNavLinks(input: {
  rvtr: string;
  artistHref?: string | null;
  albumHref?: string | null;
  /** Prefer a calendar year for Open Year (`/rv/YYYY`). */
  year?: number | string | null;
  yearHref?: string | null;
}): PublicNavModel {
  const base = publicSiteBaseUrl();
  const abs = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const songHref = abs(trackPageHref(input.rvtr));
  const artistHref = abs(input.artistHref ?? null);
  const albumHref = abs(input.albumHref ?? null);
  const yearFromNumber =
    input.year != null && String(input.year).trim() !== ""
      ? rvYearHref(input.year)
      : null;
  const yearHref = abs(yearFromNumber ?? input.yearHref ?? null);
  const chartsHref = `${base}/retroverse-2/charts`;

  return {
    songHref,
    artistHref,
    albumHref,
    yearHref,
    chartsHref,
    links: [
      { id: "song", label: "Open Song", href: songHref },
      { id: "artist", label: "Open Artist", href: artistHref },
      { id: "album", label: "Open Album", href: albumHref },
      { id: "year", label: "Open Year", href: yearHref },
      { id: "charts", label: "Open Charts", href: chartsHref },
    ],
  };
}
