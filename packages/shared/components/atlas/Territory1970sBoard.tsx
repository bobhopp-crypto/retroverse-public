import Link from "next/link";

import { atlasMissionHref } from "@/lib/atlas/mission-href";
import type { Territory1970sData } from "@/lib/atlas/types";

import { AtlasMissionCard } from "./AtlasMissionCard";
import { AtlasProgressBar, AtlasProgressRing } from "./AtlasVisuals";

type Props = {
  data: Territory1970sData;
  coverByRvtr: Record<string, string | null>;
};

const YEARS = [1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979];

export function Territory1970sBoard({ data, coverByRvtr }: Props) {
  const topMission = data.missions[0];
  const coveragePct = Math.round((data.owned / data.totalOnShelf) * 100);

  return (
    <div className="atlas-territory">
      <header className="atlas-territory__head">
        <div>
          <p className="atlas-kicker">Territory campaign</p>
          <h1 className="atlas-territory__title">1970&apos;s</h1>
        </div>
        <div className="atlas-territory__seals">
          <AtlasProgressRing pct={data.mappedPct} label="Mapped" tone="teal" />
          <AtlasProgressRing pct={coveragePct} label="Coverage" tone="orange" />
        </div>
      </header>

      {topMission ? (
        <section className="atlas-territory__hero" aria-label="Active mission">
          <AtlasMissionCard
            mission={topMission}
            coverUrl={coverByRvtr[topMission.rvtr]}
            variant="hero"
          />
          <div className="atlas-territory__hero-side">
            <div className="atlas-stat-row">
              <div className="atlas-stat-chip atlas-stat-chip--lg">
                <span className="atlas-stat-chip__num">{data.owned}</span>
                <span className="atlas-stat-chip__label">Owned</span>
              </div>
              <div className="atlas-stat-chip atlas-stat-chip--lg atlas-stat-chip--missing">
                <span className="atlas-stat-chip__num">{data.missing}</span>
                <span className="atlas-stat-chip__label">Missing</span>
              </div>
              <div className="atlas-stat-chip atlas-stat-chip--lg">
                <span className="atlas-stat-chip__num">{data.complete}</span>
                <span className="atlas-stat-chip__label">Complete</span>
              </div>
              <div className="atlas-stat-chip atlas-stat-chip--lg">
                <span className="atlas-stat-chip__num">{data.partial}</span>
                <span className="atlas-stat-chip__label">Partial</span>
              </div>
            </div>
            <div className="atlas-territory__campaigns-compact">
              <p className="atlas-kicker">Campaign progress</p>
              <ul className="atlas-campaigns-compact">
                {data.campaigns.map((c) => (
                  <li key={c.key}>
                    <span>{c.label}</span>
                    <div className="atlas-campaigns-compact__track" aria-hidden>
                      <div className="atlas-campaigns-compact__fill" style={{ width: `${c.pct}%` }} />
                    </div>
                    <strong>{c.pct}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <div className="atlas-territory__mid">
        <section className="atlas-strip-panel" aria-labelledby="atlas-map-heading">
          <h2 id="atlas-map-heading" className="atlas-kicker">
            Year regions
          </h2>
          <div className="atlas-year-strip">
            {YEARS.map((year) => (
              <div
                key={year}
                className={`atlas-year-strip__cell${year === 1976 ? " atlas-year-strip__cell--star" : ""}`}
              >
                <span>{year}</span>
                {year === 1976 ? <span className="atlas-year-strip__star">★</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="atlas-strip-panel" aria-labelledby="atlas-mission-heading">
          <h2 id="atlas-mission-heading" className="atlas-kicker">
            Mission stack
          </h2>
          <div className="atlas-mission-row">
            {data.missions.map((mission) => (
              <AtlasMissionCard
                key={mission.rvtr}
                mission={mission}
                coverUrl={coverByRvtr[mission.rvtr]}
                variant="card"
              />
            ))}
          </div>
        </section>
      </div>

      <footer className="atlas-territory__foot">
        <section className="atlas-strip-panel atlas-strip-panel--discoveries" aria-labelledby="atlas-disc-heading">
          <h2 id="atlas-disc-heading" className="atlas-kicker">
            Recent discoveries
          </h2>
          <ul className="atlas-discovery-strip">
            {data.discoveries.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="atlas-strip-panel" aria-labelledby="atlas-matters-heading">
          <h2 id="atlas-matters-heading" className="atlas-kicker">
            Priority rank
          </h2>
          <ol className="atlas-rank-strip">
            {data.missions.map((mission) => (
              <li key={mission.rvtr}>
                <span className="atlas-rank-strip__n">{mission.rank}</span>
                <span className="atlas-rank-strip__title">{mission.title}</span>
                <span className="atlas-rank-strip__score">{mission.priority}</span>
              </li>
            ))}
          </ol>
        </section>

        {topMission ? (
          <Link href={atlasMissionHref(topMission.rvtr)} className="atlas-deploy-strip atlas-deploy-strip--territory" prefetch>
            <span className="atlas-deploy-strip__label">Next move</span>
            <span className="atlas-deploy-strip__action">Deploy → {topMission.title}</span>
            <span className="atlas-deploy-strip__territory">{topMission.rvtr}</span>
          </Link>
        ) : null}
      </footer>
    </div>
  );
}
