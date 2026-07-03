import Link from "next/link";

import type { HomeMediaCard } from "@/lib/home/homepage-types";

type Props = {
  title: string;
  items: HomeMediaCard[];
  emptyMessage: string;
};

export function HomepageMediaRow({ title, items, emptyMessage }: Props) {
  return (
    <section className="home-row" aria-label={title}>
      <div className="home-row__head">
        <h2 className="home-row__title">{title}</h2>
      </div>
      {items.length > 0 ? (
        <div className="home-row__scroller">
          {items.map((item) => (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              className="home-card"
              aria-label={`${item.artist} — ${item.title}`}
            >
              <div className="home-card__cover" aria-hidden>
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt="" className="home-card__cover-img" />
                ) : (
                  <div className="home-card__cover-fallback">♫</div>
                )}
              </div>
              <p className="home-card__title">{item.title}</p>
              <p className="home-card__artist">{item.artist}</p>
              {item.year ? <p className="home-card__meta">{item.year}</p> : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="home-row__empty">{emptyMessage}</p>
      )}
    </section>
  );
}
