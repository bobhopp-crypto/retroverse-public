"use client";

import Link from "next/link";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { rvalFromPublicHref } from "@/lib/artwork/rval-from-href";
import type { AlbumPlaceholderContext } from "@/lib/artwork/album-placeholder-variant";
import { sanitizePublicNavigationHref } from "@/lib/search/entity-routes";

type CardVariant = "album" | "artist-chart";

type DiscoverCardProps = {
  variant: CardVariant;
  title: string;
  line2: string;
  line3?: string;
  /** Album release year (preferred over parsing line3 chart notes). */
  releaseYear?: number | null;
  duration?: string;
  coverUrl?: string;
  coverInitials: string;
  ariaLabel: string;
  href?: string;
};

export function DiscoverCard({
  variant,
  title,
  line2,
  line3,
  releaseYear,
  duration,
  coverUrl,
  coverInitials,
  ariaLabel,
  href,
}: DiscoverCardProps) {
  const safeHref = href ? sanitizePublicNavigationHref(href) : null;

  const albumPlaceholder: AlbumPlaceholderContext | undefined =
    variant === "album"
      ? {
          artist: line2,
          album: title,
          releaseYear:
            releaseYear != null && releaseYear > 0
              ? releaseYear
              : line3
                ? Number.parseInt(line3, 10) || null
                : null,
          rval: rvalFromPublicHref(href) ?? undefined,
        }
      : undefined;

  const artClass =
    variant === "album"
      ? "discover-card__art discover-card__art--album"
      : "discover-card__art";

  const body = (
    <>
      <div className={artClass}>
        {variant === "album" ? (
          <ArtistCover
            src={coverUrl}
            alt=""
            className="discover-card__art-img"
            fallbackClassName="discover-card__art discover-card__art--album discover-card__art--placeholder"
            fallbackVariant="plate"
            placeholderContext={albumPlaceholder}
            plateDensity="compact"
          />
        ) : coverUrl ? (
          <ArtistCover
            src={coverUrl}
            alt=""
            className="discover-card__art-img"
            fallbackClassName="discover-card__art"
            fallbackVariant="vinyl"
            placeholderContext={{ artist: title, album: line2 }}
            plateDensity="compact"
          />
        ) : (
          <span className="discover-card__art-fallback" aria-hidden>
            <span className="discover-card__art-icon">★</span>
            <span className="discover-card__art-initials">{coverInitials}</span>
          </span>
        )}
      </div>
      <div className="discover-card__footer">
        <p className="discover-card__title" title={title}>
          {title}
        </p>
        <div className="discover-card__footer-row">
          <p className="discover-card__line2" title={line2}>
            {line2}
            {line3 ? (
              <>
                <span className="discover-card__dot"> · </span>
                <span className="discover-card__meta">{line3}</span>
              </>
            ) : null}
          </p>
          {duration ? (
            <span className="discover-card__duration">{duration}</span>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <li className="discover-card-slot">
      {safeHref ? (
        <Link href={safeHref} prefetch className="discover-card" aria-label={ariaLabel}>
          {body}
        </Link>
      ) : (
        <button type="button" className="discover-card" aria-label={ariaLabel}>
          {body}
        </button>
      )}
    </li>
  );
}

export function coverInitialsFromTitle(title: string, max = 3): string {
  const words = title.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
