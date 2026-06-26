import type {
  BattingLine,
  BobLeagueBattingStats,
  BobLeaguePitchingStats,
  PitchingLine,
} from "./types";

export function emptyBattingStats(): BobLeagueBattingStats {
  return {
    G: 0,
    AB: 0,
    R: 0,
    H: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    HR: 0,
    RBI: 0,
    BB: 0,
    SO: 0,
    AVG: 0,
    OBP: 0,
    SLG: 0,
    OPS: 0,
  };
}

export function emptyPitchingStats(): BobLeaguePitchingStats {
  return {
    G: 0,
    W: 0,
    L: 0,
    IP: 0,
    H: 0,
    R: 0,
    ER: 0,
    BB: 0,
    SO: 0,
    ERA: 0,
  };
}

export function computeBattingRates(stats: Omit<BobLeagueBattingStats, "AVG" | "OBP" | "SLG" | "OPS" | "singles">): Pick<
  BobLeagueBattingStats,
  "AVG" | "OBP" | "SLG" | "OPS" | "singles"
> {
  const singles = Math.max(0, stats.H - stats.doubles - stats.triples - stats.HR);
  const ab = stats.AB;
  const pa = ab + stats.BB;

  const AVG = ab > 0 ? stats.H / ab : 0;
  const OBP = pa > 0 ? (stats.H + stats.BB) / pa : 0;
  const totalBases = singles + stats.doubles * 2 + stats.triples * 3 + stats.HR * 4;
  const SLG = ab > 0 ? totalBases / ab : 0;
  const OPS = OBP + SLG;

  return {
    singles,
    AVG: round3(AVG),
    OBP: round3(OBP),
    SLG: round3(SLG),
    OPS: round3(OPS),
  };
}

export function finalizeBattingStats(
  partial: Omit<BobLeagueBattingStats, "AVG" | "OBP" | "SLG" | "OPS" | "singles">,
): BobLeagueBattingStats {
  const rates = computeBattingRates(partial);
  return { ...partial, ...rates };
}

export function computeERA(ip: number, er: number): number {
  if (ip <= 0) return 0;
  return round2((er * 9) / ip);
}

export function finalizePitchingStats(
  partial: Omit<BobLeaguePitchingStats, "ERA">,
): BobLeaguePitchingStats {
  return { ...partial, ERA: computeERA(partial.IP, partial.ER) };
}

export function aggregateBattingLines(lines: BattingLine[]): BobLeagueBattingStats {
  const base = lines.reduce(
    (acc, line) => ({
      G: acc.G + 1,
      AB: acc.AB + line.AB,
      R: acc.R + line.R,
      H: acc.H + line.H,
      doubles: acc.doubles + line.doubles,
      triples: acc.triples + line.triples,
      HR: acc.HR + line.HR,
      RBI: acc.RBI + line.RBI,
      BB: acc.BB + line.BB,
      SO: acc.SO + line.SO,
    }),
    { G: 0, AB: 0, R: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, SO: 0 },
  );
  return finalizeBattingStats(base);
}

export function aggregatePitchingLines(lines: PitchingLine[]): BobLeaguePitchingStats {
  const base = lines.reduce(
    (acc, line) => ({
      G: acc.G + 1,
      W: acc.W + (line.W ? 1 : 0),
      L: acc.L + (line.L ? 1 : 0),
      IP: acc.IP + line.IP,
      H: acc.H + line.H,
      R: acc.R + line.R,
      ER: acc.ER + line.ER,
      BB: acc.BB + line.BB,
      SO: acc.SO + line.SO,
    }),
    { G: 0, W: 0, L: 0, IP: 0, H: 0, R: 0, ER: 0, BB: 0, SO: 0 },
  );
  return finalizePitchingStats(base);
}

export function mergeBattingStats(a: BobLeagueBattingStats, b: BobLeagueBattingStats): BobLeagueBattingStats {
  return finalizeBattingStats({
    G: a.G + b.G,
    AB: a.AB + b.AB,
    R: a.R + b.R,
    H: a.H + b.H,
    doubles: a.doubles + b.doubles,
    triples: a.triples + b.triples,
    HR: a.HR + b.HR,
    RBI: a.RBI + b.RBI,
    BB: a.BB + b.BB,
    SO: a.SO + b.SO,
  });
}

export function mergePitchingStats(a: BobLeaguePitchingStats, b: BobLeaguePitchingStats): BobLeaguePitchingStats {
  return finalizePitchingStats({
    G: a.G + b.G,
    W: a.W + b.W,
    L: a.L + b.L,
    IP: a.IP + b.IP,
    H: a.H + b.H,
    R: a.R + b.R,
    ER: a.ER + b.ER,
    BB: a.BB + b.BB,
    SO: a.SO + b.SO,
  });
}

export function formatAvg(value: number): string {
  if (value <= 0) return ".000";
  return value >= 1 ? "1.000" : value.toFixed(3).replace(/^0/, "");
}

export function formatEra(value: number): string {
  return value.toFixed(2);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
