import type { Metadata } from "next";
import Link from "next/link";

import { hot100ArtistHrefs } from "@/lib/hot100/artist-links";
import { HOT100_CREDIT, decadeHeading, hot100Years } from "@/lib/hot100/chart";
import { loadHot100Year } from "@/lib/hot100/load-year-end";

import { Hot100Masthead } from "./masthead";
import { Hot100YearJump } from "./year-jump";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Hot 100 Year-End — Retroverse",
  description: "Retroverse Hot 100 year-end charts, 1958 through 2024. Each year opens on its number one.",
};

type Cover = {
  year: number;
  title: string;
  artist: string;
};

export default async function Hot100IndexPage() {
  const years = hot100Years();
  const charts = await Promise.all(years.map((year) => loadHot100Year(year)));
  const covers: Cover[] = years.map((year, index) => {
    const top = charts[index]?.[0];
    if (!top) throw new Error(`Hot 100 ${year} has no number one`);
    return { year, title: top.title, artist: top.artist };
  });
  const artistHrefs = await hot100ArtistHrefs(covers.map((cover) => cover.artist));
  const decades: { heading: string; covers: Cover[] }[] = [];
  for (const cover of covers) {
    const heading = decadeHeading(cover.year);
    const last = decades.at(-1);
    if (!last || last.heading !== heading) decades.push({ heading, covers: [cover] });
    else last.covers.push(cover);
  }

  return (
    <main className="hot100-sheet">
      <Hot100Masthead
        kicker="Year-end charts"
        title="Hot 100"
        lede="Sixty-seven years of the chart, 1958–2024. Open a year for the full hundred."
      >
        <Hot100YearJump id="hot100-index-year" />
      </Hot100Masthead>

      {decades.map((decade) => (
        <section key={decade.heading} className="hot100-decade" aria-labelledby={decade.heading.replace(/\s+/g, "-")}>
          <h2 id={decade.heading.replace(/\s+/g, "-")} className="hot100-decade__title">
            {decade.heading}
          </h2>
          <ul className="hot100-covers">
            {decade.covers.map((cover) => {
              const artistHref = artistHrefs.get(cover.artist) ?? null;
              return (
                <li key={cover.year} className="hot100-cover">
                  <Link href={`/hot100/${cover.year}`} className="hot100-cover__main">
                    <span className="hot100-cover__year">{cover.year}</span>
                    <span className="hot100-cover__flag">No. 1</span>
                    <span className="hot100-cover__title">{cover.title}</span>
                  </Link>
                  {artistHref ? (
                    <Link href={artistHref} prefetch={false} className="hot100-cover__artist hot100-cover__artist--link">
                      {cover.artist}
                    </Link>
                  ) : (
                    <p className="hot100-cover__artist">{cover.artist}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <footer className="hot100-foot">
        <p>{HOT100_CREDIT}</p>
      </footer>
    </main>
  );
}
