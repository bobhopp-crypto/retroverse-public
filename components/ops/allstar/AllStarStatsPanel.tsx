"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { formatAvg, formatEra } from "@/lib/ops/allstar/league/stats";
import type { BobLeaguePlayerStats, BobLeagueTeamStats } from "@/lib/ops/allstar/league/types";

type StatsPayload = {
  seasonId: string | null;
  standings: BobLeagueTeamStats[];
  batting: {
    avg: BobLeaguePlayerStats[];
    hr: BobLeaguePlayerStats[];
    rbi: BobLeaguePlayerStats[];
    h: BobLeaguePlayerStats[];
    obp: BobLeaguePlayerStats[];
    slg: BobLeaguePlayerStats[];
    ops: BobLeaguePlayerStats[];
    so: BobLeaguePlayerStats[];
  };
  pitching: {
    w: BobLeaguePlayerStats[];
    l: BobLeaguePlayerStats[];
    era: BobLeaguePlayerStats[];
    ip: BobLeaguePlayerStats[];
    so: BobLeaguePlayerStats[];
    bb: BobLeaguePlayerStats[];
  };
  playerStats: BobLeaguePlayerStats[];
};

export function AllStarStatsPanel() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/ops/allstar/league/stats", { cache: "no-store" });
    if (!res.ok) return;
    setData((await res.json()) as StatsPayload);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!data) return <p className="ops-allstar__empty">Loading Bob League stats…</p>;

  const filtered = data.playerStats.filter((p) =>
    p.player.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="ops-allstar__intel">
      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <h2>Bob League Statistics</h2>
        <input
          type="search"
          className="ops-allstar__search"
          placeholder="Search players…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="ops-allstar__archive-panel">
        <h3>Team Standings</h3>
        {data.standings.length ? (
          <table className="ops-allstar__table">
            <thead>
              <tr>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>PCT</th>
                <th>RS</th>
                <th>RA</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((t) => (
                <tr key={t.team}>
                  <td><strong>{t.team}</strong></td>
                  <td>{t.W}</td>
                  <td>{t.L}</td>
                  <td>{t.pct.toFixed(3).replace(/^0/, "")}</td>
                  <td>{t.RS}</td>
                  <td>{t.RA}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="ops-allstar__empty">No standings until games are finalized.</p>
        )}
      </section>

      <div className="ops-allstar__archive-grid">
        <LeaderTable title="Batting AVG" rows={data.batting.avg} cols={["AVG", "HR", "RBI", "OPS"]} />
        <LeaderTable title="Home Runs" rows={data.batting.hr} cols={["HR", "AVG", "RBI"]} sort="HR" />
        <LeaderTable title="RBI" rows={data.batting.rbi} cols={["RBI", "HR", "AVG"]} sort="RBI" />
        <LeaderTable title="Hits" rows={data.batting.h} cols={["H", "AVG", "HR"]} sort="H" />
        <LeaderTable title="OBP" rows={data.batting.obp} cols={["OBP", "AVG", "OPS"]} sort="OBP" />
        <LeaderTable title="SLG" rows={data.batting.slg} cols={["SLG", "HR", "AVG"]} sort="SLG" />
        <LeaderTable title="OPS" rows={data.batting.ops} cols={["OPS", "OBP", "SLG"]} sort="OPS" />
        <LeaderTable title="Strikeouts (Batting)" rows={data.batting.so} cols={["SO", "AVG", "HR"]} sort="SO" />
        <LeaderTable title="Wins" rows={data.pitching.w} pitching cols={["W", "ERA", "IP"]} sort="W" />
        <LeaderTable title="Losses" rows={data.pitching.l} pitching cols={["L", "ERA", "IP"]} sort="L" />
        <LeaderTable title="ERA" rows={data.pitching.era} pitching cols={["ERA", "IP", "SO"]} />
        <LeaderTable title="Innings Pitched" rows={data.pitching.ip} pitching cols={["IP", "SO", "BB"]} sort="IP" />
        <LeaderTable title="Strikeouts (Pitching)" rows={data.pitching.so} pitching cols={["SO", "ERA", "IP"]} sort="SO" />
        <LeaderTable title="Walks (Pitching)" rows={data.pitching.bb} pitching cols={["BB", "ERA", "IP"]} sort="BB" />
      </div>

      {query ? (
        <section className="ops-allstar__archive-panel">
          <h3>Player Search</h3>
          <table className="ops-allstar__table">
            <thead>
              <tr>
                <th>Player</th>
                <th>AVG</th>
                <th>HR</th>
                <th>RBI</th>
                <th>OPS</th>
                <th>ERA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.playerId}>
                  <td>
                    <Link href={`/ops/allstar/player/${p.playerId}`}>{p.player}</Link>
                  </td>
                  <td>{formatAvg(p.batting.AVG)}</td>
                  <td>{p.batting.HR}</td>
                  <td>{p.batting.RBI}</td>
                  <td>{formatAvg(p.batting.OPS)}</td>
                  <td>{p.pitching.IP > 0 ? formatEra(p.pitching.ERA) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function LeaderTable({
  title,
  rows,
  cols,
  pitching = false,
  sort,
}: {
  title: string;
  rows: BobLeaguePlayerStats[];
  cols: string[];
  pitching?: boolean;
  sort?: string;
}) {
  return (
    <section className="ops-allstar__archive-panel">
      <h3>{title}</h3>
      {rows.length ? (
        <ol className="ops-allstar__rank-list">
          {rows.map((p) => (
            <li key={p.playerId}>
              <Link href={`/ops/allstar/player/${p.playerId}`}>{p.player}</Link>
              <span>
                {cols.map((col) => {
                  if (pitching) {
                    const v = p.pitching[col as keyof typeof p.pitching];
                    if (col === "ERA") return formatEra(Number(v));
                    return String(v);
                  }
                  const v = p.batting[col as keyof typeof p.batting];
                  if (col === "AVG" || col === "OPS" || col === "OBP" || col === "SLG") return formatAvg(Number(v));
                  return String(v);
                }).join(" · ")}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ops-allstar__empty">No data yet.</p>
      )}
    </section>
  );
}
