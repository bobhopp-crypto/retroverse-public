"use client";

import Link from "next/link";

import { toneStyle } from "@/components/magazine/tone";
import { magazineFontClass } from "@/components/theme/magazine-fonts";
import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { createPaletteAssigner, heroColor } from "@/lib/theme/magazine-palette";

import "./charts-rv2.css";
import "@/lib/theme/magazine-tokens.css";
import "@/lib/theme/magazine-site.css";

const FEATURED_YEARS = [1967, 1971, 1978, 1984, 1992, 2000, 2014];

export function ChartsHubClient() {
  const hue = heroColor("Charts");
  const paint = createPaletteAssigner(hue);
  const wordmark = paint.take("b:wm", 1);
  const kickers = [paint.take("p:singles", 1), paint.take("p:albums", 1), paint.take("p:years", 1)];
  const yearTone = paint.take("a:year", 1);

  return (
    <Rv2PublicShell className={`rv2-charts-hub rv-mag rv-mag-charts rv-mag-site ${magazineFontClass}`} activeNav="charts" yearsHref="/rv/1978" showTopBroadcastBanner={false}>
      <div className="rv-mag-page-mast">
        <a href="/" style={toneStyle(wordmark)}>Retroverse</a>
        <span>Charts</span>
      </div>
      <RetroverseBack fallbackHref="/search" fallbackLabel="Search" />
      <section className="rv2-charts-hub__hero" aria-labelledby="charts-hub-heading" style={{ ["--h" as string]: hue }}>
        <p className="rv2-live__eyebrow">Charts</p>
        <h1 id="charts-hub-heading">Billboard history, year by year</h1>
        <p className="rv2-charts-hub__lead">
          Hot 100 singles, Top 200 albums, and the RV year chronicle — same chart engine, now in the
          Retroverse shell.
        </p>
      </section>

      <section className="rv2-charts-hub__cards" aria-label="Chart collections">
        <Link href="/rv/1978" prefetch className="rv2-charts-hub__card">
          <p className="rv2-charts-hub__card-kicker" style={toneStyle(kickers[0]!)}>Singles</p>
          <h2>Hot 100 Singles</h2>
          <p>Weekly Hot 100 leaders, peaks, and chart runs by year.</p>
          <span className="rv2-charts-hub__card-cta">Open 1978 Hot 100 →</span>
        </Link>

        <Link href="/rv/1984" prefetch className="rv2-charts-hub__card">
          <p className="rv2-charts-hub__card-kicker" style={toneStyle(kickers[1]!)}>Albums</p>
          <h2>Top 200 Albums</h2>
          <p>Billboard 200 album leaders alongside singles in the year chronicle.</p>
          <span className="rv2-charts-hub__card-cta">Open 1984 albums →</span>
        </Link>

        <div className="rv2-charts-hub__card rv2-charts-hub__card--static">
          <p className="rv2-charts-hub__card-kicker" style={toneStyle(kickers[2]!)}>Years</p>
          <h2>Browse By Year</h2>
          <p>Jump into any chart year. Month and week drill-down unchanged.</p>
          <ul className="rv2-charts-hub__year-grid">
            {FEATURED_YEARS.map((year) => (
              <li key={year}>
                <Link href={`/rv/${year}`} prefetch className="rv-mag-index" style={toneStyle(yearTone)}>
                  <span className="rv-mag-index__no">{year}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Rv2PublicShell>
  );
}
