import type { StoryDisplayCard } from "@/lib/retroverse/experience/story-cards";

import "./song-experience.css";

type Props = {
  cards: StoryDisplayCard[];
  heading?: string;
  className?: string;
};

export function SongStory({ cards, heading = "The Story", className }: Props) {
  if (cards.length === 0) return null;

  const panelClass = ["rv-exp-chapter", "rv-exp-story", className].filter(Boolean).join(" ");
  const headingId = `rv-exp-story-${heading.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className={panelClass} aria-labelledby={headingId}>
      <header className="rv-exp-chapter__head">
        <h2 id={headingId}>{heading}</h2>
      </header>
      <div className="rv-exp-story__cards">
        {cards.map((card) => (
          <article key={card.id} className="rv-exp-story__card">
            {card.title && card.title !== heading ? <h3>{card.title}</h3> : null}
            {card.media && card.media.length > 0 ? (
              <div className="rv-exp-story__media">
                {card.media.map((item, index) =>
                  item.kind === "label" || !item.url ? (
                    <span key={`${item.kind}-${index}`} className="rv-exp-story__label-chip">
                      {item.caption ?? item.alt}
                    </span>
                  ) : (
                    <figure key={`${item.kind}-${index}`} className="rv-exp-story__figure">
                      <img src={item.url} alt={item.alt} className="rv-exp-story__media-img" />
                      {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                    </figure>
                  ),
                )}
              </div>
            ) : null}
            <p className="rv-exp-story__body">{card.body}</p>
            {card.context ? <p className="rv-exp-story__context">{card.context}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
