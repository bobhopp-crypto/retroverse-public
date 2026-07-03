import "server-only";

import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { allstarBundledDataDir } from "../paths";
import type {
  BobLeagueGame,
  BobLeaguePlayerStats,
  BobLeagueSeason,
  BobLeagueTeamStats,
  LeagueStore,
} from "./types";

function leagueDir(): string {
  return join(allstarBundledDataDir(), "league");
}

function seasonsPath(): string {
  return join(leagueDir(), "seasons.json");
}

function gamesPath(): string {
  return join(leagueDir(), "games.json");
}

function playerStatsPath(): string {
  return join(leagueDir(), "player-stats.json");
}

function teamStatsPath(): string {
  return join(leagueDir(), "team-stats.json");
}

async function ensureLeagueDir(): Promise<void> {
  const dir = leagueDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await ensureLeagueDir();
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function loadLeagueStore(): Promise<LeagueStore> {
  const [seasonsRaw, gamesRaw, playerRaw, teamRaw] = await Promise.all([
    readJson<{ seasons: BobLeagueSeason[] }>(seasonsPath(), { seasons: [] }),
    readJson<{ games: BobLeagueGame[] }>(gamesPath(), { games: [] }),
    readJson<{ entries: BobLeaguePlayerStats[] }>(playerStatsPath(), { entries: [] }),
    readJson<{ entries: BobLeagueTeamStats[] }>(teamStatsPath(), { entries: [] }),
  ]);

  return {
    seasons: seasonsRaw.seasons ?? [],
    games: gamesRaw.games ?? [],
    playerStats: playerRaw.entries ?? [],
    teamStats: teamRaw.entries ?? [],
  };
}

export async function saveSeasons(seasons: BobLeagueSeason[]): Promise<void> {
  await writeJson(seasonsPath(), { seasons, updatedAt: new Date().toISOString() });
}

export async function saveGames(games: BobLeagueGame[]): Promise<void> {
  await writeJson(gamesPath(), { games, updatedAt: new Date().toISOString() });
}

export async function savePlayerStats(entries: BobLeaguePlayerStats[]): Promise<void> {
  await writeJson(playerStatsPath(), { entries, updatedAt: new Date().toISOString() });
}

export async function saveTeamStats(entries: BobLeagueTeamStats[]): Promise<void> {
  await writeJson(teamStatsPath(), { entries, updatedAt: new Date().toISOString() });
}

export async function saveLeagueStore(store: LeagueStore): Promise<void> {
  await Promise.all([
    saveSeasons(store.seasons),
    saveGames(store.games),
    savePlayerStats(store.playerStats),
    saveTeamStats(store.teamStats),
  ]);
}

export function nextId(prefix: string, existing: string[]): string {
  const nums = existing
    .map((id) => {
      const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}
