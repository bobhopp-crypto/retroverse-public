import type { BaseballEra, EraBucket, PlayerIntelligenceProfile } from "./types";

export const ERA_DEFINITIONS: Array<{ key: BaseballEra; label: string; range: string; min: number; max: number }> = [
  { key: "deadBall", label: "Dead Ball Era", range: "1901–1919", min: 1901, max: 1919 },
  { key: "babeRuth", label: "Babe Ruth Era", range: "1920–1941", min: 1920, max: 1941 },
  { key: "postWar", label: "Post-War Era", range: "1946–1960", min: 1946, max: 1960 },
  { key: "expansion", label: "Expansion Era", range: "1961–1976", min: 1961, max: 1976 },
  { key: "modern", label: "Modern Era", range: "1977–present", min: 1977, max: 9999 },
];

export function eraFromYears(debutYear: number, finalYear: number): BaseballEra {
  const midpoint = Math.round((debutYear + finalYear) / 2);
  const match = ERA_DEFINITIONS.find((era) => midpoint >= era.min && midpoint <= era.max);
  return match?.key ?? "modern";
}

export function decadeFromYear(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

export function buildEraAnalysis(profiles: PlayerIntelligenceProfile[]): EraBucket[] {
  return ERA_DEFINITIONS.map((era) => {
    const inEra = profiles.filter((p) => p.record.era === era.key);
    const count = inEra.length;
    const avg = (key: "homeRun" | "strikeout" | "walk") => {
      if (!count) return 0;
      return (
        inEra.reduce((sum, profile) => {
          const item = profile.outcomeSummary.find((o) => o.key === key);
          return sum + (item?.probability ?? 0);
        }, 0) / count
      );
    };
    return {
      key: era.key,
      label: era.label,
      range: era.range,
      playerCount: count,
      avgHomeRun: avg("homeRun"),
      avgStrikeout: avg("strikeout"),
      avgWalk: avg("walk"),
    };
  });
}
