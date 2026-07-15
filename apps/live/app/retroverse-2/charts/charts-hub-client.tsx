"use client";

import Link from "next/link";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./charts-rv2.css";

const FEATURED_YEARS = [1967, 1971, 1978, 1984, 1992, 2000, 2014];

export function ChartsHubClient() {
  return (
    <Rv2PublicShell className="rv2-charts-hub" activeNav="charts" yearsHref="/rv/1978">
      <RetroverseBack fallbackHref="/search" fallbackLabel="Search" />
      <section className="rv2-charts-hub__hero" aria-labelledby="charts-hub-heading">
        <p className="rv2-live__eyebrow">Charts</p>
        <h1 id="charts-hub-heading">Billboard history, year by year</h1>
        <p className="rv2-charts-hub__lead">
          Hot 100 singles, Top 200 albums, and the RV year chronicle — same chart engine, now in the
          Retroverse shell.
        </p>
      </section>

      <section className="rv2-charts-hub__cards" aria-label="Chart collections">
        <Link href="/rv/1978" prefetch className="rv2-charts-hub__card">
          <p className="rv2-charts-hub__card-kicker">Singles</p>
          <h2>Hot 100 Singles</h2>
          <p>Weekly Hot 100 leaders, peaks, and chart runs by year.</p>
          <span className="rv2-charts-hub__card-cta">Open 1978 Hot 100 →</span>
        </Link>

        <Link href="/rv/1984" prefetch className="rv2-charts-hub__card">
          <p className="rv2-charts-hub__card-kicker">Albums</p>
          <h2>Top 200 Albums</h2>
          <p>Billboard 200 album leaders alongside singles in the year chronicle.</p>
          <span className="rv2-charts-hub__card-cta">Open 1984 albums →</span>
        </Link>

        <div className="rv2-charts-hub__card rv2-charts-hub__card--static">
          <p className="rv2-charts-hub__card-kicker">Years</p>
          <h2>Browse By Year</h2>
          <p>Jump into any chart year. Month and week drill-down unchanged.</p>
          <ul className="rv2-charts-hub__year-grid">
            {FEATURED_YEARS.map((year) => (
              <li key={year}>
                <Link href={`/rv/${year}`} prefetch>
                  {year}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Rv2PublicShell>
  );
}
