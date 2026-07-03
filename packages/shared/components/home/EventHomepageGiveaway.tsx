"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isGiveawayRegistered } from "@/lib/giveaway/registration-client-state";
import type { EventHomepageGiveaway } from "@/lib/home/event-homepage-types";

type Props = {
  giveaway: EventHomepageGiveaway;
};

export function EventHomepageGiveaway({ giveaway }: Props) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(isGiveawayRegistered(giveaway.eventKey, giveaway.giveawayId));
  }, [giveaway.eventKey, giveaway.giveawayId]);

  return (
    <section id="giveaway" className="event-giveaway" aria-label="Tonight's giveaway">
      <div className="event-giveaway__media">
        {giveaway.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={giveaway.heroImageUrl} alt={giveaway.prizeTitle} />
        ) : (
          <div className="event-giveaway__media-placeholder">{giveaway.prizeTitle}</div>
        )}
      </div>
      <div className="event-giveaway__copy">
        <p className="event-giveaway__eyebrow">Tonight&apos;s Giveaway</p>
        <h2 className="event-giveaway__title">{giveaway.prizeTitle}</h2>
        <p className="event-giveaway__desc">{giveaway.prizeDescription}</p>
        {entered ? (
          <p className="event-giveaway__entered" role="status">
            ✓ You&apos;re entered.
          </p>
        ) : (
          <Link href={giveaway.registrationUrl} className="event-giveaway__cta">
            {giveaway.registerLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
