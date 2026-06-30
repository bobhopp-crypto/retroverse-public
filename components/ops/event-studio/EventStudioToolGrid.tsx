import Link from "next/link";

import type { EventStudioToolCard } from "@/lib/ops/event-studio/types";

type Props = {
  cards: EventStudioToolCard[];
};

export function EventStudioToolGrid({ cards }: Props) {
  return (
    <div className="ops-event-studio__cards">
      {cards.map((card) => {
        const className = [
          "ops-event-studio__card",
          card.status === "active" ? "ops-event-studio__card--active" : "ops-event-studio__card--planned",
        ].join(" ");

        const body = (
          <>
            <div className="ops-event-studio__card-head">
              <h2>{card.title}</h2>
              {card.badge ? <span className="ops-event-studio__card-badge">{card.badge}</span> : null}
            </div>
            <p>{card.description}</p>
            {card.status === "active" && card.href ? (
              <span className="ops-event-studio__card-cta">Open →</span>
            ) : (
              <span className="ops-event-studio__card-cta ops-event-studio__card-cta--dim">Planned</span>
            )}
          </>
        );

        if (card.href && card.status === "active") {
          return (
            <Link key={card.id} href={card.href} className={className}>
              {body}
            </Link>
          );
        }

        return (
          <article key={card.id} className={className} aria-disabled="true">
            {body}
          </article>
        );
      })}
    </div>
  );
}
