"use client";

import { cardColorForIndex } from "@/lib/search/card-colors";

type DiscoverCardProps = {
  title: string;
  subtitle: string;
  year: number;
  note?: string;
  badge?: string;
  hasVdj?: boolean;
  coverAccent: string;
  coverUrl?: string;
  coverInitials: string;
  index: number;
  ariaLabel: string;
};

export function DiscoverCard({
  title,
  subtitle,
  year,
  note,
  badge,
  hasVdj,
  coverAccent,
  coverUrl,
  coverInitials,
  index,
  ariaLabel,
}: DiscoverCardProps) {
  const color = cardColorForIndex(index);
  const tilt = index % 2 === 0 ? "-0.4deg" : "0.35deg";

  return (
    <li className="discover-card-slot">
      <button
        type="button"
        className="discover-card"
        style={
          {
            "--card-bg": color.bg,
            "--card-border": color.border,
            "--card-tilt": tilt,
            "--cover-accent": coverAccent,
          } as React.CSSProperties
        }
        aria-label={ariaLabel}
      >
        <div className="discover-card__cover">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="discover-card__cover-img" />
          ) : (
            <span className="discover-card__cover-initials" aria-hidden="true">
              {coverInitials}
            </span>
          )}
        </div>
        <div className="discover-card__body">
          {badge ? <span className="discover-card__badge">{badge}</span> : null}
          <p className="discover-card__title">{title}</p>
          <p className="discover-card__subtitle">{subtitle}</p>
          <div className="discover-card__meta">
            <span className="discover-card__year">{year}</span>
            {note ? <span className="discover-card__note">{note}</span> : null}
            {hasVdj ? (
              <span className="discover-card__vdj" title="In your VirtualDJ library">
                VDJ
              </span>
            ) : null}
          </div>
        </div>
      </button>
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
