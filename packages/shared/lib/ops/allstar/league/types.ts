export type SeasonStatus = "active" | "completed" | "archived";

export type BobLeagueSeason = {
  id: string;
  name: string;
  status: SeasonStatus;
  createdAt: string;
};

export type GameMode = "digital" | "physical" | "manual";
export type GameStatus = "draft" | "final";

export type BattingLine = {
  playerId: string;
  player: string;
  team: string;
  AB: number;
  R: number;
  H: number;
  doubles: number;
  triples: number;
  HR: number;
  RBI: number;
  BB: number;
  SO: number;
};

export type PitchingLine = {
  playerId: string;
  player: string;
  team: string;
  IP: number;
  H: number;
  R: number;
  ER: number;
  BB: number;
  SO: number;
  W?: boolean;
  L?: boolean;
};

export type BoxScoreSide = {
  batting: BattingLine[];
  pitching: PitchingLine[];
};

export type BoxScore = {
  away: BoxScoreSide;
  home: BoxScoreSide;
};

export type BobLeagueGame = {
  id: string;
  seasonId: string;
  date: string;
  mode: GameMode;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  innings: number;
  status: GameStatus;
  boxScore: BoxScore;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
};

export type BobLeagueBattingStats = {
  G: number;
  AB: number;
  R: number;
  H: number;
  singles: number;
  doubles: number;
  triples: number;
  HR: number;
  RBI: number;
  BB: number;
  SO: number;
  AVG: number;
  OBP: number;
  SLG: number;
  OPS: number;
};

export type BobLeaguePitchingStats = {
  G: number;
  W: number;
  L: number;
  IP: number;
  H: number;
  R: number;
  ER: number;
  BB: number;
  SO: number;
  ERA: number;
};

export type BobLeaguePlayerStats = {
  seasonId: string;
  playerId: string;
  player: string;
  team: string;
  batting: BobLeagueBattingStats;
  pitching: BobLeaguePitchingStats;
};

export type BobLeagueTeamStats = {
  seasonId: string;
  team: string;
  W: number;
  L: number;
  RS: number;
  RA: number;
  pct: number;
};

export type PlateAppearanceResult = {
  playerId: string;
  player: string;
  team: string;
  AB?: number;
  R?: number;
  H?: number;
  doubles?: number;
  triples?: number;
  HR?: number;
  RBI?: number;
  BB?: number;
  SO?: number;
};

export type LeagueStore = {
  seasons: BobLeagueSeason[];
  games: BobLeagueGame[];
  playerStats: BobLeaguePlayerStats[];
  teamStats: BobLeagueTeamStats[];
};

export type GameLogEntry = {
  gameId: string;
  date: string;
  opponent: string;
  team: string;
  AB: number;
  H: number;
  HR: number;
  RBI: number;
  BB: number;
  SO: number;
};

export type PlayerLeagueProfile = {
  seasonStats: BobLeaguePlayerStats | null;
  allTimeStats: BobLeaguePlayerStats | null;
  gameLog: GameLogEntry[];
};
