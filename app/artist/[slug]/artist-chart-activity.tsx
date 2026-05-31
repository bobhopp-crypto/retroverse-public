import Link from "next/link";

import { artistSectionHref } from "@/lib/artist/routes";
import type { ChartDecadeBar } from "@/lib/artist/types";

import { ArtistViewAll } from "./artist-view-all";

type Props = {
  slug: string;
  decades: ChartDecadeBar[];
};

function decadeLabel(decade: number): string {
  return `${decade}s`;
}

export function ArtistChartActivity({ slug, decades }: Props) {
  if (decades.length === 0) return null;

  const maxCount = Math.max(...decades.map((d) => d.count), 1);

  return (
    <section className="artist-chart-activity" aria-labelledby="chart-activity">
      <div className="artist-section-head artist-section-head--activity">
        <h2 id="chart-activity">Chart activity</h2>
        <ArtistViewAll href={artistSectionHref(slug, "charts")} variant="dark" />
      </div>
      <p className="artist-chart-activity__lead">Hot 100 weeks by decade — career pulse at a glance.</p>
      <ul className="artist-chart-activity__list">
        {decades.map((bar) => (
          <li key={bar.decade} className="artist-chart-activity__row">
            <span className="artist-chart-activity__label">{decadeLabel(bar.decade)}</span>
            <div className="artist-chart-activity__bar-track" aria-hidden>
              <div
                className="artist-chart-activity__bar-fill"
                style={{ width: `${Math.round((bar.count / maxCount) * 100)}%` }}
              />
            </div>
            <span className="artist-chart-activity__count">{bar.count}</span>
          </li>
        ))}
      </ul>
      <Link href={artistSectionHref(slug, "charts")} prefetch className="artist-chart-activity__charts-link">
        Open chart timeline →
      </Link>
    </section>
  );
}
