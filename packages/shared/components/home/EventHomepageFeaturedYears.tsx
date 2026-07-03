import Link from "next/link";

import type { HomeFeaturedYear } from "@/lib/home/home-featured-years";

type Props = {
  years: HomeFeaturedYear[];
};

export function EventHomepageFeaturedYears({ years }: Props) {
  return (
    <section className="event-years" aria-labelledby="event-years-heading">
      <h2 id="event-years-heading" className="event-years__title">
        Featured Years
      </h2>
      <div className="event-years__grid">
        {years.map((entry) => (
          <Link
            key={entry.year}
            href={entry.href}
            className="event-years__card"
            aria-label={`Explore ${entry.year}`}
          >
            <span className="event-years__number">{entry.year}</span>
            <span className="event-years__desc">{entry.descriptor}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
