import Link from "next/link";

import type { LivingProductionCard } from "@/lib/ops/studio/living/types";

type Props = {
  productions: LivingProductionCard[];
  title?: string;
  emptyMessage?: string;
};

export function ProductionFilmStrip({ productions, title = "Recent productions", emptyMessage }: Props) {
  if (productions.length === 0) {
    return emptyMessage ? (
      <section className="rs-living-filmstrip rs-living-filmstrip--empty">
        <h2 className="rs-living-filmstrip__title">{title}</h2>
        <p>{emptyMessage}</p>
      </section>
    ) : null;
  }

  return (
    <section className="rs-living-filmstrip">
      <h2 className="rs-living-filmstrip__title">{title}</h2>
      <div className="rs-living-filmstrip__track">
        {productions.map((prod) => (
          <Link key={prod.rvtr} href={prod.href} className="rs-living-filmstrip__frame">
            <div className="rs-living-filmstrip__thumb">
              {prod.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prod.coverUrl} alt="" />
              ) : (
                <span>{prod.title.slice(0, 1)}</span>
              )}
            </div>
            <p className="rs-living-filmstrip__artist">{prod.artist}</p>
            <p className="rs-living-filmstrip__title-text">{prod.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
