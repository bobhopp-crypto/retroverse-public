import type { HeroCard } from "@/lib/universal-renderer/card-types";

type Props = { card: HeroCard };

export function HeroCard({ card }: Props) {
  return (
    <section className="urx__slide urx__slide--hero" aria-label="Now playing">
      {card.coverUrl ? (
        <img
          className="urx__hero-image"
          src={card.coverUrl}
          alt={`${card.title} — ${card.artist} album art`}
          loading="eager"
        />
      ) : null}

      <div className="urx__hero-wash" aria-hidden="true" />
      <div className="urx__hero-scrim" aria-hidden="true" />

      <div className="urx__hero-content">
        <span className="urx__now-playing">
          <span className="urx__now-playing-dot" aria-hidden="true" />
          Now Playing
        </span>
        <p className="urx__hero-artist">{card.artist}</p>
        <h1 className="urx__hero-title">{card.title}</h1>
        {card.year ? <p className="urx__hero-year">{card.year}</p> : null}
      </div>

      <p className="urx__swipe-hint" aria-hidden="true">Swipe to explore →</p>
    </section>
  );
}
