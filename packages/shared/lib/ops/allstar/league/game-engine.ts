import type {
  BattingLine,
  BobLeagueGame,
  BobLeaguePlayerStats,
  BobLeagueSeason,
  BobLeagueTeamStats,
  BoxScore,
  GameLogEntry,
  LeagueStore,
  PitchingLine,
  PlateAppearanceResult,
  PlayerLeagueProfile,
} from "./types";
import {
  aggregateBattingLines,
  aggregatePitchingLines,
  emptyBattingStats,
  emptyPitchingStats,
  mergeBattingStats,
  mergePitchingStats,
} from "./stats";
import { loadLeagueStore, nextId, saveGames, saveLeagueStore, savePlayerStats, saveSeasons, saveTeamStats } from "./storage";

function emptyBoxScore(): BoxScore {
  return { away: { batting: [], pitching: [] }, home: { batting: [], pitching: [] } };
}

function slugPlayerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolvePlayerId(playerId: string, player: string): string {
  const id = playerId.trim();
  if (id) return id;
  const slug = slugPlayerName(player);
  return slug ? `manual:${slug}` : "";
}

function normalizeBattingLine(line: BattingLine): BattingLine {
  return { ...line, playerId: resolvePlayerId(line.playerId, line.player) };
}

function normalizePitchingLine(line: PitchingLine): PitchingLine {
  return { ...line, playerId: resolvePlayerId(line.playerId, line.player) };
}

export function normalizeGameBoxScore(game: BobLeagueGame): BobLeagueGame {
  return {
    ...game,
    boxScore: {
      away: {
        batting: game.boxScore.away.batting.map(normalizeBattingLine).filter((l) => l.playerId),
        pitching: game.boxScore.away.pitching.map(normalizePitchingLine).filter((l) => l.playerId),
      },
      home: {
        batting: game.boxScore.home.batting.map(normalizeBattingLine).filter((l) => l.playerId),
        pitching: game.boxScore.home.pitching.map(normalizePitchingLine).filter((l) => l.playerId),
      },
    },
  };
}

export function createGame(input: {
  seasonId: string;
  date: string;
  mode: BobLeagueGame["mode"];
  awayTeam: string;
  homeTeam: string;
  innings?: number;
}): BobLeagueGame {
  const now = new Date().toISOString();
  return {
    id: `game-${Date.now()}`,
    seasonId: input.seasonId,
    date: input.date,
    mode: input.mode,
    awayTeam: input.awayTeam,
    homeTeam: input.homeTeam,
    awayScore: 0,
    homeScore: 0,
    innings: input.innings ?? 9,
    status: "draft",
    boxScore: emptyBoxScore(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function createGameInStore(input: Parameters<typeof createGame>[0]): Promise<BobLeagueGame> {
  const store = await loadLeagueStore();
  const game = createGame(input);
  game.id = nextId(
    "game",
    store.games.map((g) => g.id),
  );
  store.games.push(game);
  await saveGames(store.games);
  return game;
}

function findBattingLine(lines: BattingLine[], playerId: string): BattingLine | undefined {
  return lines.find((l) => l.playerId === playerId);
}

function upsertBattingLine(lines: BattingLine[], line: BattingLine): BattingLine[] {
  const idx = lines.findIndex((l) => l.playerId === line.playerId);
  if (idx >= 0) {
    const next = [...lines];
    next[idx] = line;
    return next;
  }
  return [...lines, line];
}

export function recordPlateAppearance(
  game: BobLeagueGame,
  side: "away" | "home",
  pa: PlateAppearanceResult,
): BobLeagueGame {
  if (game.status === "final") {
    throw new Error("Cannot modify a finalized game");
  }

  const team = pa.team || (side === "away" ? game.awayTeam : game.homeTeam);
  const existing = findBattingLine(game.boxScore[side].batting, pa.playerId);
  const line: BattingLine = {
    playerId: pa.playerId,
    player: pa.player,
    team,
    AB: (existing?.AB ?? 0) + (pa.AB ?? 0),
    R: (existing?.R ?? 0) + (pa.R ?? 0),
    H: (existing?.H ?? 0) + (pa.H ?? 0),
    doubles: (existing?.doubles ?? 0) + (pa.doubles ?? 0),
    triples: (existing?.triples ?? 0) + (pa.triples ?? 0),
    HR: (existing?.HR ?? 0) + (pa.HR ?? 0),
    RBI: (existing?.RBI ?? 0) + (pa.RBI ?? 0),
    BB: (existing?.BB ?? 0) + (pa.BB ?? 0),
    SO: (existing?.SO ?? 0) + (pa.SO ?? 0),
  };

  return {
    ...game,
    updatedAt: new Date().toISOString(),
    boxScore: {
      ...game.boxScore,
      [side]: {
        ...game.boxScore[side],
        batting: upsertBattingLine(game.boxScore[side].batting, line),
      },
    },
  };
}

export function recalculateSeasonStats(store: LeagueStore, seasonId: string): LeagueStore {
  const finalGames = store.games.filter((g) => g.seasonId === seasonId && g.status === "final");

  const playerMap = new Map<string, BobLeaguePlayerStats>();
  const teamMap = new Map<string, BobLeagueTeamStats>();

  for (const game of finalGames) {
    const awayWon = game.awayScore > game.homeScore;
    const homeWon = game.homeScore > game.awayScore;

    for (const side of ["away", "home"] as const) {
      const teamName = side === "away" ? game.awayTeam : game.homeTeam;
      const runsScored = side === "away" ? game.awayScore : game.homeScore;
      const runsAllowed = side === "away" ? game.homeScore : game.awayScore;
      const won = side === "away" ? awayWon : homeWon;
      const lost = side === "away" ? homeWon : awayWon;

      const teamKey = `${seasonId}::${teamName}`;
      const teamEntry = teamMap.get(teamKey) ?? {
        seasonId,
        team: teamName,
        W: 0,
        L: 0,
        RS: 0,
        RA: 0,
        pct: 0,
      };
      if (won) teamEntry.W += 1;
      if (lost) teamEntry.L += 1;
      teamEntry.RS += runsScored;
      teamEntry.RA += runsAllowed;
      teamEntry.pct = teamEntry.W + teamEntry.L > 0 ? teamEntry.W / (teamEntry.W + teamEntry.L) : 0;
      teamMap.set(teamKey, teamEntry);

      for (const line of game.boxScore[side].batting) {
        const playerId = resolvePlayerId(line.playerId, line.player);
        if (!playerId) continue;
        const key = `${seasonId}::${playerId}`;
        const batting = aggregateBattingLines([line]);
        const existing = playerMap.get(key);
        if (existing) {
          playerMap.set(key, {
            ...existing,
            player: line.player,
            team: line.team,
            batting: mergeBattingStats(existing.batting, batting),
          });
        } else {
          playerMap.set(key, {
            seasonId,
            playerId,
            player: line.player,
            team: line.team,
            batting,
            pitching: emptyPitchingStats(),
          });
        }
      }

      for (const line of game.boxScore[side].pitching) {
        const playerId = resolvePlayerId(line.playerId, line.player);
        if (!playerId) continue;
        const key = `${seasonId}::${playerId}`;
        const pitching = aggregatePitchingLines([line]);
        const existing = playerMap.get(key);
        if (existing) {
          playerMap.set(key, {
            ...existing,
            player: line.player,
            team: line.team,
            pitching: mergePitchingStats(existing.pitching, pitching),
          });
        } else {
          playerMap.set(key, {
            seasonId,
            playerId,
            player: line.player,
            team: line.team,
            batting: emptyBattingStats(),
            pitching,
          });
        }
      }
    }
  }

  const otherSeasonPlayers = store.playerStats.filter((p) => p.seasonId !== seasonId);
  const otherSeasonTeams = store.teamStats.filter((t) => t.seasonId !== seasonId);

  return {
    ...store,
    playerStats: [...otherSeasonPlayers, ...playerMap.values()],
    teamStats: [...otherSeasonTeams, ...teamMap.values()],
  };
}

export async function finalizeGame(gameId: string): Promise<BobLeagueGame> {
  const store = await loadLeagueStore();
  const idx = store.games.findIndex((g) => g.id === gameId);
  if (idx < 0) throw new Error("Game not found");

  const game = store.games[idx];
  if (game.status === "final") return game;

  const finalized: BobLeagueGame = {
    ...game,
    status: "final",
    finalizedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.games[idx] = finalized;
  const updated = recalculateSeasonStats(store, game.seasonId);
  await saveLeagueStore(updated);
  return finalized;
}

export async function saveGameDraft(game: BobLeagueGame): Promise<BobLeagueGame> {
  if (game.status === "final") throw new Error("Game is locked");

  const store = await loadLeagueStore();
  const normalized = normalizeGameBoxScore({ ...game, updatedAt: new Date().toISOString() });
  const idx = store.games.findIndex((g) => g.id === game.id);
  let payload = normalized;

  if (idx >= 0) {
    store.games[idx] = payload;
  } else {
    payload = {
      ...payload,
      id: nextId(
        "game",
        store.games.map((g) => g.id),
      ),
    };
    store.games.push(payload);
  }

  await saveGames(store.games);
  return payload;
}

export async function createSeason(name: string): Promise<BobLeagueSeason> {
  const store = await loadLeagueStore();
  const season: BobLeagueSeason = {
    id: nextId(
      "bob-league",
      store.seasons.map((s) => s.id),
    ),
    name,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  store.seasons.push(season);
  await saveSeasons(store.seasons);
  return season;
}

export async function loadPlayerLeagueProfile(playerId: string): Promise<PlayerLeagueProfile> {
  const store = await loadLeagueStore();
  const activeSeason = store.seasons.find((s) => s.status === "active") ?? store.seasons[0];

  const seasonEntries = store.playerStats.filter((p) => p.playerId === playerId);
  const seasonStats = activeSeason
    ? seasonEntries.find((p) => p.seasonId === activeSeason.id) ?? null
    : null;

  let allTimeBatting = emptyBattingStats();
  let allTimePitching = emptyPitchingStats();
  let playerName = seasonStats?.player ?? "";
  let team = seasonStats?.team ?? "";

  for (const entry of seasonEntries) {
    allTimeBatting = mergeBattingStats(allTimeBatting, entry.batting);
    allTimePitching = mergePitchingStats(allTimePitching, entry.pitching);
    playerName = entry.player || playerName;
    team = entry.team || team;
  }

  const allTimeStats: BobLeaguePlayerStats | null =
    seasonEntries.length > 0
      ? {
          seasonId: "__alltime__",
          playerId,
          player: playerName,
          team,
          batting: allTimeBatting,
          pitching: allTimePitching,
        }
      : null;

  const gameLog: GameLogEntry[] = [];
  for (const game of store.games.filter((g) => g.status === "final")) {
    for (const side of ["away", "home"] as const) {
      const line = game.boxScore[side].batting.find(
        (b) => resolvePlayerId(b.playerId, b.player) === playerId,
      );
      if (!line) continue;
      const teamName = side === "away" ? game.awayTeam : game.homeTeam;
      const opponent = side === "away" ? game.homeTeam : game.awayTeam;
      gameLog.push({
        gameId: game.id,
        date: game.date,
        opponent,
        team: teamName,
        AB: line.AB,
        H: line.H,
        HR: line.HR,
        RBI: line.RBI,
        BB: line.BB,
        SO: line.SO,
      });
    }
  }

  gameLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { seasonStats, allTimeStats, gameLog };
}

export type BattingLeaderSort = keyof BobLeaguePlayerStats["batting"];

export function battingLeaders(
  store: LeagueStore,
  seasonId: string | null,
  sort: BattingLeaderSort = "AVG",
  minAb = 1,
): BobLeaguePlayerStats[] {
  const entries = seasonId
    ? store.playerStats.filter((p) => p.seasonId === seasonId)
    : aggregateAllTimePlayerStats(store);

  return entries
    .filter((p) => p.batting.AB >= minAb)
    .sort((a, b) => b.batting[sort] - a.batting[sort]);
}

export function pitchingLeaders(
  store: LeagueStore,
  seasonId: string | null,
  sort: keyof BobLeaguePlayerStats["pitching"] = "ERA",
  minIp = 0,
): BobLeaguePlayerStats[] {
  const entries = seasonId
    ? store.playerStats.filter((p) => p.seasonId === seasonId)
    : aggregateAllTimePlayerStats(store);

  return entries
    .filter((p) => p.pitching.IP >= minIp && p.pitching.G > 0)
    .sort((a, b) => {
      if (sort === "ERA") return a.pitching.ERA - b.pitching.ERA;
      return b.pitching[sort] - a.pitching[sort];
    });
}

function aggregateAllTimePlayerStats(store: LeagueStore): BobLeaguePlayerStats[] {
  const map = new Map<string, BobLeaguePlayerStats>();
  for (const entry of store.playerStats) {
    const existing = map.get(entry.playerId);
    if (existing) {
      map.set(entry.playerId, {
        ...existing,
        batting: mergeBattingStats(existing.batting, entry.batting),
        pitching: mergePitchingStats(existing.pitching, entry.pitching),
      });
    } else {
      map.set(entry.playerId, { ...entry, seasonId: "__alltime__" });
    }
  }
  return [...map.values()];
}

export function teamStandings(store: LeagueStore, seasonId: string): BobLeagueTeamStats[] {
  return store.teamStats
    .filter((t) => t.seasonId === seasonId)
    .sort((a, b) => b.pct - a.pct || b.W - a.W);
}

export function upsertPitchingLine(lines: PitchingLine[], line: PitchingLine): PitchingLine[] {
  const idx = lines.findIndex((l) => l.playerId === line.playerId);
  if (idx >= 0) {
    const next = [...lines];
    next[idx] = line;
    return next;
  }
  return [...lines, line];
}
