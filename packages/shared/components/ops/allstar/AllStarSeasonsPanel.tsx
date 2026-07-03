"use client";

import { useCallback, useEffect, useState } from "react";

import type { BobLeagueSeason } from "@/lib/ops/allstar/league/types";

export function AllStarSeasonsPanel() {
  const [seasons, setSeasons] = useState<BobLeagueSeason[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/ops/allstar/league/seasons", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { seasons: BobLeagueSeason[] };
    setSeasons(data.seasons);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createSeason() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/allstar/league/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create season");
      }
      setName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-allstar__intel">
      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <h2>Bob League Seasons</h2>
        <p className="ops-allstar__comparison-lead">
          Manage tabletop and manual scorekeeping seasons. Stats accumulate from finalized games.
        </p>
        <div className="ops-allstar__season-form">
          <input
            type="text"
            placeholder="Bob League 1974"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" disabled={busy} onClick={() => void createSeason()}>
            Create Season
          </button>
        </div>
        {error ? <p className="ops-allstar__empty">{error}</p> : null}
      </section>

      <section className="ops-allstar__archive-panel">
        <h3>Seasons</h3>
        {seasons.length ? (
          <table className="ops-allstar__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr key={season.id}>
                  <td><strong>{season.name}</strong></td>
                  <td>{season.status}</td>
                  <td>{new Date(season.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="ops-allstar__empty">No seasons yet. Create one to start scorekeeping.</p>
        )}
      </section>
    </div>
  );
}
