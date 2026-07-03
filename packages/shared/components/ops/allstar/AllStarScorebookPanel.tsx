"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  BattingLine,
  BobLeagueGame,
  BobLeagueSeason,
  BoxScore,
  PitchingLine,
} from "@/lib/ops/allstar/league/types";

type PreservedPlayer = { id: string; player: string; position: string };

type Props = {
  preservedPlayers: PreservedPlayer[];
};

function emptyBatting(team: string): BattingLine {
  return {
    playerId: "",
    player: "",
    team,
    AB: 0,
    R: 0,
    H: 0,
    doubles: 0,
    triples: 0,
    HR: 0,
    RBI: 0,
    BB: 0,
    SO: 0,
  };
}

function emptyPitching(team: string): PitchingLine {
  return { playerId: "", player: "", team, IP: 0, H: 0, R: 0, ER: 0, BB: 0, SO: 0 };
}

function num(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function AllStarScorebookPanel({ preservedPlayers }: Props) {
  const [seasons, setSeasons] = useState<BobLeagueSeason[]>([]);
  const [games, setGames] = useState<BobLeagueGame[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [awayTeam, setAwayTeam] = useState("Visitors");
  const [homeTeam, setHomeTeam] = useState("Home");
  const [awayScore, setAwayScore] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [boxScore, setBoxScore] = useState<BoxScore>({
    away: { batting: [emptyBatting("Visitors")], pitching: [emptyPitching("Visitors")] },
    home: { batting: [emptyBatting("Home")], pitching: [emptyPitching("Home")] },
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [seasonRes, gameRes] = await Promise.all([
      fetch("/api/ops/allstar/league/seasons", { cache: "no-store" }),
      fetch("/api/ops/allstar/league/games", { cache: "no-store" }),
    ]);
    if (seasonRes.ok) {
      const data = (await seasonRes.json()) as { seasons: BobLeagueSeason[] };
      setSeasons(data.seasons);
      if (!seasonId && data.seasons[0]) setSeasonId(data.seasons[0].id);
    }
    if (gameRes.ok) {
      const data = (await gameRes.json()) as { games: BobLeagueGame[] };
      setGames(data.games);
    }
  }, [seasonId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function loadGame(game: BobLeagueGame) {
    if (game.status === "final") {
      setMessage("Game is locked (finalized).");
      return;
    }
    setGameId(game.id);
    setSeasonId(game.seasonId);
    setDate(game.date.slice(0, 10));
    setAwayTeam(game.awayTeam);
    setHomeTeam(game.homeTeam);
    setAwayScore(game.awayScore);
    setHomeScore(game.homeScore);
    setBoxScore(game.boxScore);
    setMessage(null);
  }

  function buildGamePayload(): BobLeagueGame {
    return {
      id: gameId ?? `game-${Date.now()}`,
      seasonId,
      date: new Date(date).toISOString(),
      mode: "manual",
      awayTeam,
      homeTeam,
      awayScore,
      homeScore,
      innings: 9,
      status: "draft",
      boxScore: {
        away: {
          batting: boxScore.away.batting.filter((r) => r.player.trim()),
          pitching: boxScore.away.pitching.filter((r) => r.player.trim()),
        },
        home: {
          batting: boxScore.home.batting.filter((r) => r.player.trim()),
          pitching: boxScore.home.pitching.filter((r) => r.player.trim()),
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async function persistDraft(): Promise<string | null> {
    const res = await fetch("/api/ops/allstar/league/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGamePayload()),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { game: BobLeagueGame };
    setGameId(data.game.id);
    return data.game.id;
  }

  async function saveDraft() {
    if (!seasonId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const id = await persistDraft();
      if (!id) throw new Error("Save failed");
      setMessage("Draft saved.");
      await refresh();
    } catch {
      setMessage("Could not save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function finalizeGame() {
    if (!seasonId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const id = await persistDraft();
      if (!id) throw new Error("Save failed");
      const res = await fetch("/api/ops/allstar/league/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", id }),
      });
      if (!res.ok) throw new Error("Finalize failed");
      setMessage("Game finalized. Season stats updated.");
      await refresh();
    } catch {
      setMessage("Could not finalize game.");
    } finally {
      setBusy(false);
    }
  }

  async function updateSeasonStats() {
    if (!seasonId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/allstar/league/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId }),
      });
      if (!res.ok) throw new Error("Recalculate failed");
      setMessage("Season stats recalculated.");
    } catch {
      setMessage("Could not update season stats.");
    } finally {
      setBusy(false);
    }
  }

  async function newGame() {
    if (!seasonId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/allstar/league/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, awayTeam, homeTeam, date, mode: "manual" }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = (await res.json()) as { game: BobLeagueGame };
      loadGame(data.game);
      setMessage("New game created.");
      await refresh();
    } catch {
      setMessage("Could not create game.");
    } finally {
      setBusy(false);
    }
  }

  function updateBatting(
    side: "away" | "home",
    index: number,
    field: keyof BattingLine,
    value: string | number,
  ) {
    setBoxScore((prev) => {
      const rows = [...prev[side].batting];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, [side]: { ...prev[side], batting: rows } };
    });
  }

  function updatePitching(
    side: "away" | "home",
    index: number,
    field: keyof PitchingLine,
    value: string | number | boolean,
  ) {
    setBoxScore((prev) => {
      const rows = [...prev[side].pitching];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, [side]: { ...prev[side], pitching: rows } };
    });
  }

  function pickPlayer(
    side: "away" | "home",
    kind: "batting" | "pitching",
    index: number,
    playerId: string,
  ) {
    const p = preservedPlayers.find((x) => x.id === playerId);
    if (!p) return;
    const team = side === "away" ? awayTeam : homeTeam;
    if (kind === "batting") {
      updateBatting(side, index, "playerId", playerId);
      updateBatting(side, index, "player", p.player);
      updateBatting(side, index, "team", team);
      return;
    }
    updatePitching(side, index, "playerId", playerId);
    updatePitching(side, index, "player", p.player);
    updatePitching(side, index, "team", team);
  }

  const drafts = games.filter((g) => g.status === "draft");

  return (
    <div className="ops-allstar__intel">
      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <h2>Scorebook</h2>
        <p className="ops-allstar__comparison-lead">
          Manual box score entry for physical tabletop games. Finalize to update Bob League stats.
        </p>
        <div className="ops-allstar__scorebook-meta">
          <label>
            Season
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
              <option value="">Select season</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Away
            <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} />
          </label>
          <label>
            Home
            <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} />
          </label>
          <label>
            Away score
            <input type="number" value={awayScore} onChange={(e) => setAwayScore(num(e.target.value))} />
          </label>
          <label>
            Home score
            <input type="number" value={homeScore} onChange={(e) => setHomeScore(num(e.target.value))} />
          </label>
        </div>
        <div className="ops-allstar__preserve-actions">
          <button type="button" disabled={busy || !seasonId} onClick={() => void newGame()}>New Game</button>
          <button type="button" disabled={busy} onClick={() => void saveDraft()}>Save Draft</button>
          <button type="button" disabled={busy || !seasonId} onClick={() => void finalizeGame()}>Finalize Game</button>
          <button type="button" disabled={busy || !seasonId} onClick={() => void updateSeasonStats()}>Update Season Stats</button>
        </div>
        {message ? <p className="ops-allstar__comparison-lead">{message}</p> : null}
      </section>

      {(["away", "home"] as const).map((side) => (
        <section key={side} className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
          <h3>{side === "away" ? awayTeam : homeTeam} — Batting</h3>
          <div className="ops-allstar__table-wrap">
            <table className="ops-allstar__table ops-allstar__scorebook-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>AB</th>
                  <th>R</th>
                  <th>H</th>
                  <th>2B</th>
                  <th>3B</th>
                  <th>HR</th>
                  <th>RBI</th>
                  <th>BB</th>
                  <th>SO</th>
                </tr>
              </thead>
              <tbody>
                {boxScore[side].batting.map((row, idx) => (
                  <tr key={`${side}-bat-${idx}`}>
                    <td>
                      <select
                        value={row.playerId}
                        onChange={(e) => pickPlayer(side, "batting", idx, e.target.value)}
                      >
                        <option value="">Manual / pick…</option>
                        {preservedPlayers.map((p) => (
                          <option key={p.id} value={p.id}>{p.player}</option>
                        ))}
                      </select>
                      <input
                        value={row.player}
                        placeholder="Player name"
                        onChange={(e) => updateBatting(side, idx, "player", e.target.value)}
                      />
                    </td>
                    {(["AB", "R", "H", "doubles", "triples", "HR", "RBI", "BB", "SO"] as const).map((f) => (
                      <td key={f}>
                        <input
                          type="number"
                          min={0}
                          value={row[f]}
                          onChange={(e) => updateBatting(side, idx, f, num(e.target.value))}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() =>
              setBoxScore((prev) => ({
                ...prev,
                [side]: {
                  ...prev[side],
                  batting: [...prev[side].batting, emptyBatting(side === "away" ? awayTeam : homeTeam)],
                },
              }))
            }
          >
            + Batter
          </button>

          <h3>Pitching</h3>
          <table className="ops-allstar__table ops-allstar__scorebook-table">
            <thead>
              <tr>
                <th>Pitcher</th>
                <th>IP</th>
                <th>H</th>
                <th>R</th>
                <th>ER</th>
                <th>BB</th>
                <th>SO</th>
                <th>W</th>
              </tr>
            </thead>
            <tbody>
              {boxScore[side].pitching.map((row, idx) => (
                <tr key={`${side}-pit-${idx}`}>
                  <td>
                    <select
                      value={row.playerId}
                      onChange={(e) => pickPlayer(side, "pitching", idx, e.target.value)}
                    >
                      <option value="">Manual / pick…</option>
                      {preservedPlayers.map((p) => (
                        <option key={p.id} value={p.id}>{p.player}</option>
                      ))}
                    </select>
                    <input
                      value={row.player}
                      placeholder="Pitcher name"
                      onChange={(e) => updatePitching(side, idx, "player", e.target.value)}
                    />
                  </td>
                  {(["IP", "H", "R", "ER", "BB", "SO"] as const).map((f) => (
                    <td key={f}>
                      <input
                        type="number"
                        min={0}
                        step={f === "IP" ? 0.1 : 1}
                        value={row[f]}
                        onChange={(e) => updatePitching(side, idx, f, num(e.target.value))}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(row.W)}
                      onChange={(e) => updatePitching(side, idx, "W", e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {drafts.length ? (
        <section className="ops-allstar__archive-panel">
          <h3>Draft Games</h3>
          <ul className="ops-allstar__findings">
            {drafts.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => loadGame(g)}>
                  {g.awayTeam} {g.awayScore} @ {g.homeTeam} {g.homeScore} — {g.date.slice(0, 10)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
