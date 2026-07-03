import Link from "next/link";

import type { CollectionIntelligence } from "@/lib/ops/allstar/intelligence/types";
import { ERA_DEFINITIONS } from "@/lib/ops/allstar/intelligence/eras";

type Props = {
  intelligence: CollectionIntelligence;
};

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function corr(value: number | null): string {
  if (value == null) return "— (need 2+ players)";
  return value.toFixed(3);
}

export function AllStarResearchPanel({ intelligence }: Props) {
  const { research, eras, profiles, researchTiers } = intelligence;
  const tiers = researchTiers;

  return (
    <div className="ops-allstar__intel">
      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <h2>Research Unlock Progress</h2>
        <p className="ops-allstar__comparison-lead">
          {tiers.preservedCount} preserved · Active tier: {tiers.activeTier.label}
        </p>
        <div className="ops-allstar__milestones">
          {tiers.tiers.map((tier) => (
            <article key={tier.id} className={`ops-allstar__milestone ${tier.unlocked ? "is-unlocked" : ""}`}>
              <div className="ops-allstar__milestone-head">
                <strong>{tier.label}</strong>
                <span>{tier.unlocked ? "Unlocked" : `${tiers.preservedCount}/${tier.threshold}`}</span>
              </div>
              <p>{tier.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <h2>Cadaco Formula Research</h2>
        <p className="ops-allstar__comparison-lead">
          Reverse-engineering how Cadaco translated real baseball into disc probabilities.
        </p>
        {!tiers.correlationsEnabled ? (
          <p className="ops-allstar__empty">Correlations unlock at 25 preserved players.</p>
        ) : (
          <div className="ops-allstar__research-grid">
            {research.correlations.map((item) => (
              <article key={item.metric} className="ops-allstar__research-stat">
                <strong>{item.metric}</strong>
                <span>{corr(item.correlation)}</span>
                <small>n={item.sampleSize}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="ops-allstar__archive-grid">
        <section className="ops-allstar__archive-panel">
          <h3>Top Accurate Cards</h3>
          {!tiers.rankingsEnabled ? (
            <p className="ops-allstar__empty">Unlocks at 10 preserved players.</p>
          ) : (
            <ol className="ops-allstar__rank-list">
              {research.mostAccurate.map((item) => (
                <li key={item.discId}>
                  <Link href={`/ops/allstar/player/${item.discId}`}>{item.player}</Link>
                  <span>{item.accuracyScore}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="ops-allstar__archive-panel">
          <h3>Least Accurate Cards</h3>
          {!tiers.rankingsEnabled ? (
            <p className="ops-allstar__empty">Unlocks at 10 preserved players.</p>
          ) : (
            <ol className="ops-allstar__rank-list">
              {research.leastAccurate.map((item) => (
                <li key={item.discId}>
                  <Link href={`/ops/allstar/player/${item.discId}`}>{item.player}</Link>
                  <span>{item.accuracyScore}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="ops-allstar__archive-panel">
          <h3>Most Surprising Cards</h3>
          {!tiers.accuracyStudiesEnabled ? (
            <p className="ops-allstar__empty">Unlocks at 100 preserved players.</p>
          ) : (
            <ol className="ops-allstar__rank-list">
              {research.mostSurprising.map((item) => (
                <li key={item.discId}>
                  <Link href={`/ops/allstar/player/${item.discId}`}>{item.player}</Link>
                  <span>{(item.surpriseScore * 100).toFixed(1)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <h2>Era Analysis</h2>
        <p className="ops-allstar__comparison-lead">How did Cadaco represent baseball across eras?</p>
        {!tiers.eraComparisonsEnabled ? (
          <p className="ops-allstar__empty">Era comparisons unlock at 50 preserved players.</p>
        ) : (
          <div className="ops-allstar__era-grid">
            {eras.map((era) => {
              const def = ERA_DEFINITIONS.find((d) => d.key === era.key);
              return (
                <article key={era.key} className="ops-allstar__era-card">
                  <h3>{def?.label ?? era.label}</h3>
                  <p>{era.range}</p>
                  <p>{era.playerCount} preserved players</p>
                  <ul>
                    <li>Avg HR {pct(era.avgHomeRun)}</li>
                    <li>Avg K {pct(era.avgStrikeout)}</li>
                    <li>Avg BB {pct(era.avgWalk)}</li>
                  </ul>
                </article>
              );
            })}
          </div>
        )}
        {!tiers.fullFormulaEnabled && tiers.preservedCount > 0 ? (
          <p className="ops-allstar__empty">
            Full Cadaco formula research unlocks at 166 / 166 preserved.
          </p>
        ) : null}
      </section>
    </div>
  );
}
