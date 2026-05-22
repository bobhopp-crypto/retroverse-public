"use client";

type CardVariant = "album" | "song" | "artist-chart";

type DiscoverCardProps = {
  variant: CardVariant;
  title: string;
  line2: string;
  line3?: string;
  duration?: string;
  coverUrl?: string;
  coverInitials: string;
  ariaLabel: string;
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
}: DiscoverCardProps) {
  const icon = variant === "album" ? "◉" : variant === "song" ? "♪" : "★";

  return (
    <li className="discover-card-slot">
      <button type="button" className="discover-card" aria-label={ariaLabel}>
        <div className="discover-card__art">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="discover-card__art-img" />
          ) : (
            <>
              <span className="discover-card__art-icon" aria-hidden="true">
                {icon}
              </span>
              {!coverUrl && variant === "album" ? (
                <span className="discover-card__art-label">Album cover</span>
              ) : null}
            </>
          )}
        </div>
        <div className="discover-card__footer">
          <p className="discover-card__title">{title}</p>
          <div className="discover-card__footer-row">
            <p className="discover-card__line2">
              {line2}
              {line3 ? (
                <>
                  <span className="discover-card__dot"> • </span>
                  {line3}
                </>
              ) : null}
            </p>
            {duration ? (
              <span className="discover-card__duration">{duration}</span>
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
