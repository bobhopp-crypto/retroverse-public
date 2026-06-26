"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { displayCanonicalFile } from "@/lib/ops/allstar/canonical-display";
import type { ExplorerEntry, ExplorerFilters } from "@/lib/ops/allstar/intelligence/types";

type Props = {
  entries: ExplorerEntry[];
  positions: string[];
  teams: string[];
  decades: string[];
};
export function AllStarExplorerPanel({ entries, positions, teams, decades }: Props) {
  const [view, setView] = useState<"grid" | "table" | "timeline">("grid");
  const [filters, setFilters] = useState<ExplorerFilters>({
    position: "all",
    hallOfFame: "all",
    team: "all",
    era: "all",
    decade: "all",
    processed: "all",
  });

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (filters.position !== "all" && !entry.position.toUpperCase().includes(filters.position.toUpperCase())) {
        return false;
      }
      if (filters.hallOfFame === "hof" && !entry.hallOfFame) return false;
      if (filters.hallOfFame === "non-hof" && entry.hallOfFame) return false;
      if (filters.team !== "all" && !entry.teams.some((t) => t.toUpperCase().includes(filters.team.toUpperCase()))) {
        return false;
      }
      if (filters.era !== "all" && entry.era !== filters.era) return false;
      if (filters.decade !== "all" && entry.decade !== filters.decade) return false;
      if (filters.processed === "processed" && !entry.processed) return false;
      if (filters.processed === "pending" && entry.processed) return false;
      return true;
    });
  }, [entries, filters]);

  const timeline = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ay = Number.parseInt(a.decade, 10) || 0;
        const by = Number.parseInt(b.decade, 10) || 0;
        return ay - by;
      }),
    [filtered],
  );

  return (
    <div className="ops-allstar__intel">
      <div className="ops-allstar__intel-toolbar">
        <div className="ops-allstar__intel-filters">
          <label>
            Position
            <select
              value={filters.position}
              onChange={(e) => setFilters((f) => ({ ...f, position: e.target.value }))}
            >
              <option value="all">All</option>
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            HoF
            <select
              value={filters.hallOfFame}
              onChange={(e) => setFilters((f) => ({ ...f, hallOfFame: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="hof">Hall of Fame</option>
              <option value="non-hof">Non-HoF</option>
            </select>
          </label>
          <label>
            Team
            <select
              value={filters.team}
              onChange={(e) => setFilters((f) => ({ ...f, team: e.target.value }))}
            >
              <option value="all">All</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Era
            <select
              value={filters.era}
              onChange={(e) => setFilters((f) => ({ ...f, era: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="deadBall">Dead Ball</option>
              <option value="babeRuth">Babe Ruth</option>
              <option value="postWar">Post-War</option>
              <option value="expansion">Expansion</option>
              <option value="modern">Modern</option>
            </select>
          </label>
          <label>
            Decade
            <select
              value={filters.decade}
              onChange={(e) => setFilters((f) => ({ ...f, decade: e.target.value }))}
            >
              <option value="all">All</option>
              {decades.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.processed}
              onChange={(e) => setFilters((f) => ({ ...f, processed: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="processed">Processed</option>
              <option value="pending">Pending</option>
            </select>
          </label>
        </div>
        <div className="ops-allstar__view-toggle">
          {(["grid", "table", "timeline"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={view === mode ? "is-active" : undefined}
              onClick={() => setView(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <p className="ops-allstar__intel-count">{filtered.length} players in view</p>

      {view === "grid" ? (
        <div className="ops-allstar__card-grid">
          {filtered.map((entry) => (
            <Link key={entry.discId} href={`/ops/allstar/player/${entry.discId}`} className="ops-allstar__card">
              <img src={entry.thumbnailUrl} alt="" className="ops-allstar__card-art" />
              <div className="ops-allstar__card-body">
                {entry.hallOfFame ? <span className="ops-allstar__card-badge">HoF</span> : null}
                <strong>{entry.player || entry.discId}</strong>
                <span>{entry.position || "—"}</span>
                <span className="ops-allstar__canonical-name">{displayCanonicalFile(entry)}</span>
                <span>{entry.processed ? `Accuracy ${entry.accuracyScore ?? "—"}` : "Pending"}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {view === "table" ? (
        <div className="ops-allstar__table-wrap">
          <table className="ops-allstar__table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Canonical file</th>
                <th>Position</th>
                <th>Teams</th>
                <th>Era</th>
                <th>Decade</th>
                <th>Status</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.discId}>
                  <td>
                    <Link href={`/ops/allstar/player/${entry.discId}`}>{entry.player || "—"}</Link>
                  </td>
                  <td><code>{displayCanonicalFile(entry)}</code></td>
                  <td>{entry.position || "—"}</td>
                  <td>{entry.teams.join(", ") || "—"}</td>
                  <td>{entry.era}</td>
                  <td>{entry.decade}</td>
                  <td>{entry.processed ? "Processed" : "Pending"}</td>
                  <td>{entry.accuracyScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view === "timeline" ? (
        <div className="ops-allstar__timeline">
          {timeline.map((entry) => (
            <article key={entry.discId} className="ops-allstar__timeline-item">
              <div className="ops-allstar__timeline-marker">{entry.decade}</div>
              <div className="ops-allstar__timeline-body">
                <Link href={`/ops/allstar/player/${entry.discId}`}>
                  <strong>{entry.player || entry.discId}</strong>
                </Link>
                <span>
                  {entry.position} · <code>{displayCanonicalFile(entry)}</code> ·{" "}
                  {entry.processed ? `Cadaco score ${entry.accuracyScore}` : "Awaiting preservation"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
