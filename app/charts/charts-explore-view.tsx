"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ArtistChartsHistoryClient } from "@/app/artist/[slug]/artist-charts-history-client";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import {
  chartExploreDecadeLabel,
  chartExploreDecades,
  chartExploreYearsInDecade,
} from "@/lib/charts/charts-explore-years";
import { yearSuggestionHref } from "@/lib/search/entity-routes";

import "@/app/artist/[slug]/artist-charts-history.css";
import "../rv/[year]/rv-year.css";
import "./charts-page.css";

export function ChartsExploreView() {
  const decades = chartExploreDecades();
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [history, setHistory] = useState<ArtistChartHistory | null>(null);
  const [loadingYear, setLoadingYear] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const yearsInDecade =
    selectedDecade != null ? chartExploreYearsInDecade(selectedDecade) : [];

  const loadYear = useCallback(async (year: number) => {
    setSelectedYear(year);
    setLoadingYear(true);
    setLoadError(null);
    setHistory(null);

    try {
      const res = await fetch(`/api/charts/year?year=${year}`, { cache: "no-store" });
      if (!res.ok) {
        setLoadError("No chart chronicle for this year yet.");
        return;
      }
      const body = (await res.json()) as { ok?: boolean; history?: ArtistChartHistory };
      if (!body.ok || !body.history) {
        setLoadError("No chart chronicle for this year yet.");
        return;
      }
      setHistory(body.history);
    } catch {
      setLoadError("Could not load chart chronicle.");
    } finally {
      setLoadingYear(false);
    }
  }, []);

  const pickDecade = (decade: number) => {
    setSelectedDecade(decade);
    setSelectedYear(null);
    setHistory(null);
    setLoadError(null);
  };

  const resetExplore = () => {
    setSelectedDecade(null);
    setSelectedYear(null);
    setHistory(null);
    setLoadError(null);
  };

  return (
    <div className="rv-year-world charts-world">
      <div className="rv-year-world__grain" aria-hidden />

      <header className="rv-year-topbar">
        <Link href="/" className="rv-year-logo">
          Retroverse
        </Link>
        <span className="rv-year-file-tag">Chart Time Travel</span>
      </header>

      <section className="charts-world-hero" aria-labelledby="charts-world-heading">
        <p className="rv-year-hero__eyebrow">Enter the chronicle</p>
        <h1 id="charts-world-heading" className="charts-world-hero__title">
          RV Charts
        </h1>
        <p className="charts-world-hero__tagline">
          Decade by decade — week by week — who held #1.
        </p>
        <p className="charts-world-hero__lead">
          Search finds artists and songs. Charts are time travel through Hot 100 and Album 200 history.
        </p>
      </section>

      <section className="charts-explore" aria-label="Chart time travel navigation">
        <div className="charts-explore__step">
          <div className="charts-explore__step-head">
            <span className="charts-explore__step-num">1</span>
            <h2 className="charts-explore__step-title">Select decade</h2>
            {selectedDecade != null ? (
              <button type="button" className="charts-explore__clear" onClick={resetExplore}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="charts-explore__pills">
            {decades.map((decade) => (
              <button
                key={decade}
                type="button"
                className={`charts-explore__pill${selectedDecade === decade ? " charts-explore__pill--active" : ""}`}
                aria-pressed={selectedDecade === decade}
                onClick={() => pickDecade(decade)}
              >
                {chartExploreDecadeLabel(decade)}
              </button>
            ))}
          </div>
        </div>

        {selectedDecade != null ? (
          <>
            <div className="charts-explore__divider" aria-hidden>
              ↓
            </div>
            <div className="charts-explore__step">
              <div className="charts-explore__step-head">
                <span className="charts-explore__step-num">2</span>
                <h2 className="charts-explore__step-title">
                  Select year ({chartExploreDecadeLabel(selectedDecade)})
                </h2>
              </div>
              <div className="charts-explore__pills charts-explore__pills--years">
                {yearsInDecade.map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={`charts-explore__pill charts-explore__pill--year${selectedYear === year ? " charts-explore__pill--active" : ""}`}
                    aria-pressed={selectedYear === year}
                    onClick={() => loadYear(year)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="charts-explore__hint">Pick a decade to choose an RV Year.</p>
        )}
      </section>

      {selectedYear != null ? (
        <section className="charts-world-chronicle" aria-label={`${selectedYear} chart chronicle`}>
          <div className="rv-year-bridge charts-world-bridge">
            <h2 className="rv-year-bridge__title">RV {selectedYear}</h2>
            <p className="rv-year-bridge__hint">
              Pick a month — each week reveals who held #1.{" "}
              <Link href={yearSuggestionHref(selectedYear)} className="charts-world-bridge__link">
                Open full year world →
              </Link>
            </p>
          </div>

          {loadingYear ? (
            <p className="charts-explore__status" role="status">
              Loading chart chronicle…
            </p>
          ) : null}

          {loadError ? (
            <p className="charts-explore__status charts-explore__status--error" role="status">
              {loadError}
            </p>
          ) : null}

          {history && !loadingYear ? (
            <ArtistChartsHistoryClient
              key={selectedYear}
              artistName={`RV ${selectedYear}`}
              history={history}
              highlightTrackIds={[]}
              hideBanner
              hideYearStep
              initialRvYear={selectedYear}
            />
          ) : null}
        </section>
      ) : null}

      <footer className="rv-year-footer">
        <Link href="/">← Home</Link>
        <Link href="/search">Search entities</Link>
      </footer>
    </div>
  );
}
