import Link from "next/link";

import type { DirectorProductionSnapshot } from "@/lib/ops/studio/living/types";

import { ActivityTimeline } from "./ActivityTimeline";
import { ProductionFilmStrip } from "./ProductionFilmStrip";

type Props = {
  snapshot: DirectorProductionSnapshot;
};

export function DirectorProductionRoom({ snapshot }: Props) {
  const { current, steps, progressPct, mood } = snapshot;

  return (
    <div className="rs-living-director">
      <header className="rs-living-director__head">
        <p className="rs-living-director__atmosphere">Film production · Storyboard floor</p>
        <h1 className="rs-living-director__title">Director</h1>
        <p className="rs-living-director__lead">
          Designs the patron museum experience — flow, exhibits, and reveal.
        </p>
      </header>

      <section className="rs-living-director__production">
        <h2 className="rs-living-director__section-title">Current production</h2>
        {current ? (
          <>
            <Link href={current.href} className="rs-living-director__hero">
              <div className="rs-living-director__hero-art">
                {current.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.coverUrl} alt="" />
                ) : (
                  <span>{current.title.slice(0, 1)}</span>
                )}
              </div>
              <div>
                <p className="rs-living-director__hero-label">Planning experience</p>
                <h3 className="rs-living-director__hero-title">{current.title}</h3>
                <p className="rs-living-director__hero-artist">{current.artist}</p>
              </div>
            </Link>

            <div className="rs-living-director__progress-wrap">
              <div className="rs-living-director__progress-bar" style={{ width: `${progressPct}%` }} />
            </div>

            <ol className="rs-living-director__steps">
              {steps.map((step) => (
                <li
                  key={step.id}
                  className={`rs-living-director__step rs-living-director__step--${step.status}`}
                >
                  <span className="rs-living-director__step-icon" aria-hidden>
                    {step.status === "done" ? "✓" : step.status === "active" ? "•" : "○"}
                  </span>
                  {step.label}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="rs-living-director__idle">{snapshot.emptyMessage}</p>
        )}
      </section>

      <ProductionFilmStrip
        productions={snapshot.recentProductions}
        title={mood === "idle" ? "Recent productions" : "Storyboard reel"}
        emptyMessage="Waiting for the next approved story…"
      />

      <ActivityTimeline events={snapshot.activityFeed} title="Production log" />
    </div>
  );
}
