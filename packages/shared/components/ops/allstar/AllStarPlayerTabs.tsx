"use client";

import Link from "next/link";
import { useState } from "react";

import { displayCanonicalFile } from "@/lib/ops/allstar/canonical-display";
import { formatAvg, formatEra } from "@/lib/ops/allstar/league/stats";
import type { PlayerIntelligenceProfile } from "@/lib/ops/allstar/intelligence/types";
import type { PlayerLeagueProfile } from "@/lib/ops/allstar/league/types";

type Props = {
  profile: PlayerIntelligenceProfile;
  league: PlayerLeagueProfile;
};

type Tab = "cadaco" | "mlb" | "bob";

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function AllStarPlayerTabs({ profile, league }: Props) {
  const [tab, setTab] = useState<Tab>("cadaco");
  const { record, archive, outcomeSummary, comparison } = profile;
  const scanUrl = `/api/ops/allstar/image?kind=scan&id=${encodeURIComponent(record.discId)}`;
  const reviewUrl = `/api/ops/allstar/image?kind=review&id=${encodeURIComponent(record.discId)}`;

  return (
    <div className="ops-allstar__player">
      <div className="ops-allstar__player-hero">
        <div>
          <p className="ops-allstar__archive-kicker">Player Intelligence</p>
          <h2 className="ops-allstar__player-name">{record.fullName}</h2>
          <p className="ops-allstar__player-meta">
            {record.position} · {record.primaryTeams.join(" · ")} · {record.debutYear}–{record.finalYear}
          </p>
          <p className="ops-allstar__player-canonical">{displayCanonicalFile(archive)}</p>
        </div>
        <div className="ops-allstar__accuracy-badge">
          <strong>{comparison.accuracyScore}</strong>
          <span>Cadaco Accuracy</span>
          <small>{comparison.accuracyLabel}</small>
        </div>
      </div>

      <nav className="ops-allstar__player-tabs" aria-label="Stat layers">
        {(
          [
            ["cadaco", "Cadaco Card"],
            ["mlb", "MLB Career"],
            ["bob", "Bob League"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "is-active" : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "cadaco" ? (
        <div className="ops-allstar__player-grid">
          <section className="ops-allstar__archive-panel">
            <h3>Disc vs Reality</h3>
            <p className="ops-allstar__comparison-lead">{comparison.summary}</p>
            <table className="ops-allstar__comparison-table">
              <thead>
                <tr>
                  <th>Rate</th>
                  <th>Disc</th>
                  <th>MLB</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rates.map((rate) => (
                  <tr key={rate.key}>
                    <td>{rate.label}</td>
                    <td>{pct(rate.discPct)}</td>
                    <td>{pct(rate.actualPct)}</td>
                    <td>{rate.delta >= 0 ? "+" : ""}{(rate.delta * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="ops-allstar__archive-panel">
            <h3>Original Disc</h3>
            <img className="ops-allstar__scan" src={scanUrl} alt="" />
          </section>
          <section className="ops-allstar__archive-panel">
            <h3>Review Image</h3>
            <img className="ops-allstar__scan" src={reviewUrl} alt="" />
          </section>
          <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
            <h3>Disc Probability Table</h3>
            <table className="ops-allstar__prob-table">
              <thead>
                <tr>
                  <th>Outcome</th>
                  <th>Degrees</th>
                  <th>Probability</th>
                </tr>
              </thead>
              <tbody>
                {outcomeSummary.map((item) => (
                  <tr key={item.key}>
                    <td>{item.label}</td>
                    <td>{item.degrees.toFixed(1)}°</td>
                    <td>{pct(item.probability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href={`/ops/allstar/analysis/${record.discId}`}>Open disc analysis →</Link>
          </section>
        </div>
      ) : null}

      {tab === "mlb" ? (
        <section className="ops-allstar__archive-panel">
          <h3>MLB Career (Historical)</h3>
          <dl className="ops-allstar__ref-card">
            <div><dt>Debut</dt><dd>{record.debutYear}</dd></div>
            <div><dt>Final season</dt><dd>{record.finalYear}</dd></div>
            <div><dt>Career WAR</dt><dd>{record.career.war.toFixed(1)}</dd></div>
            <div><dt>Games</dt><dd>{record.career.games.toLocaleString()}</dd></div>
            <div><dt>PA</dt><dd>{record.career.pa.toLocaleString()}</dd></div>
            <div><dt>HR</dt><dd>{record.career.hr}</dd></div>
            <div><dt>BB</dt><dd>{record.career.bb}</dd></div>
            <div><dt>SO</dt><dd>{record.career.so}</dd></div>
            <div><dt>2B</dt><dd>{record.career.doubles}</dd></div>
            <div><dt>3B</dt><dd>{record.career.triples}</dd></div>
          </dl>
          {record.notes ? <p className="ops-allstar__player-note">{record.notes}</p> : null}
        </section>
      ) : null}

      {tab === "bob" ? (
        <div className="ops-allstar__player-grid">
          <BobStatsBlock title="Current Season" stats={league.seasonStats} />
          <BobStatsBlock title="All-Time Bob League" stats={league.allTimeStats} />
          <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
            <h3>Game Log</h3>
            {league.gameLog.length ? (
              <table className="ops-allstar__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Team</th>
                    <th>Opp</th>
                    <th>AB</th>
                    <th>H</th>
                    <th>HR</th>
                    <th>RBI</th>
                    <th>BB</th>
                    <th>SO</th>
                  </tr>
                </thead>
                <tbody>
                  {league.gameLog.map((g) => (
                    <tr key={g.gameId}>
                      <td>{g.date.slice(0, 10)}</td>
                      <td>{g.team}</td>
                      <td>{g.opponent}</td>
                      <td>{g.AB}</td>
                      <td>{g.H}</td>
                      <td>{g.HR}</td>
                      <td>{g.RBI}</td>
                      <td>{g.BB}</td>
                      <td>{g.SO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="ops-allstar__empty">
                No Bob League games yet.{" "}
                <Link href="/ops/allstar/scorebook">Enter a scorebook game →</Link>
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function BobStatsBlock({
  title,
  stats,
}: {
  title: string;
  stats: PlayerLeagueProfile["seasonStats"];
}) {
  if (!stats) {
    return (
      <section className="ops-allstar__archive-panel">
        <h3>{title}</h3>
        <p className="ops-allstar__empty">No stats recorded.</p>
      </section>
    );
  }

  const b = stats.batting;
  const p = stats.pitching;

  return (
    <section className="ops-allstar__archive-panel">
      <h3>{title}</h3>
      <dl className="ops-allstar__ref-card">
        <div><dt>G</dt><dd>{b.G}</dd></div>
        <div><dt>AVG</dt><dd>{formatAvg(b.AVG)}</dd></div>
        <div><dt>OBP</dt><dd>{formatAvg(b.OBP)}</dd></div>
        <div><dt>SLG</dt><dd>{formatAvg(b.SLG)}</dd></div>
        <div><dt>OPS</dt><dd>{formatAvg(b.OPS)}</dd></div>
        <div><dt>HR</dt><dd>{b.HR}</dd></div>
        <div><dt>RBI</dt><dd>{b.RBI}</dd></div>
        <div><dt>SO</dt><dd>{b.SO}</dd></div>
      </dl>
      {p.G > 0 ? (
        <dl className="ops-allstar__ref-card">
          <div><dt>IP</dt><dd>{p.IP}</dd></div>
          <div><dt>ERA</dt><dd>{formatEra(p.ERA)}</dd></div>
          <div><dt>W-L</dt><dd>{p.W}-{p.L}</dd></div>
          <div><dt>SO</dt><dd>{p.SO}</dd></div>
        </dl>
      ) : null}
    </section>
  );
}
