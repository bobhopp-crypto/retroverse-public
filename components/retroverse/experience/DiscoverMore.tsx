import Link from "next/link";

import type { DiscoverShelf } from "@/lib/retroverse/experience/discover-shelves";

import "./song-experience.css";

type Props = {
  shelves: DiscoverShelf[];
  heading?: string;
  className?: string;
};

export function DiscoverMore({ shelves, heading, className }: Props) {
  if (shelves.length === 0) return null;

  const panelClass = ["rv-exp-chapter", "rv-exp-discover", className].filter(Boolean).join(" ");
  const sectionHeading = heading ?? (shelves.length === 1 ? shelves[0]!.title : "Discover More");
  const headingId = `rv-exp-discover-${sectionHeading.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className={panelClass} aria-labelledby={headingId}>
      <header className="rv-exp-chapter__head">
        <h2 id={headingId}>{sectionHeading}</h2>
      </header>
      <div className="rv-exp-discover__shelves">
        {shelves.map((shelf) => (
          <div key={shelf.id} className="rv-exp-discover__shelf">
            {shelves.length > 1 ? <h3>{shelf.title}</h3> : null}
            <ul className="rv-exp-discover__rail">
              {shelf.cards.map((card) => (
                <li key={card.id}>
                  <Link href={card.href} className="rv-exp-discover__card" prefetch>
                    <span className="rv-exp-discover__cover-wrap">
                      {card.coverUrl ? (
                        <img src={card.coverUrl} alt="" className="rv-exp-discover__cover" />
                      ) : (
                        <span className="rv-exp-discover__cover rv-exp-discover__cover--empty" aria-hidden />
                      )}
                    </span>
                    <span className="rv-exp-discover__copy">
                      <span className="rv-exp-discover__title">{card.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
