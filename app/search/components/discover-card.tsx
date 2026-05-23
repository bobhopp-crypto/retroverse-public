"use client";

import Link from "next/link";
import { useState } from "react";

type CardVariant = "album" | "artist-chart";

type DiscoverCardProps = {
  variant: CardVariant;
  title: string;
  line2: string;
  line3?: string;
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
  duration,
  coverUrl,
  coverInitials,
  ariaLabel,
  href,
}: DiscoverCardProps) {
  const icon = variant === "album" ? "◉" : "★";
  const [imgBroken, setImgBroken] = useState(false);
  const showCover = Boolean(coverUrl?.trim()) && !imgBroken;

  const artClass =
    variant === "album"
      ? "discover-card__art discover-card__art--album"
      : "discover-card__art";

  const body = (
    <>
      <div className={artClass}>
        {showCover ? (
          <img
            src={coverUrl}
            alt=""
            className="discover-card__art-img"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <>
            <span className="discover-card__art-icon" aria-hidden="true">
              {icon}
            </span>
            {variant === "album" ? (
              <span className="discover-card__art-label">Album cover</span>
            ) : null}
            <span className="discover-card__art-initials" aria-hidden="true">
              {coverInitials}
            </span>
          </>
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
      {href ? (
        <Link href={href} className="discover-card" aria-label={ariaLabel}>
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
