import type { TerritoryCard } from "./types";

/** Placeholder decades until per-decade audit runners exist. 1970s filled from live audit. */
export const WORLD_TERRITORIES: TerritoryCard[] = [
  {
    id: "1950s",
    label: "1950s",
    slug: null,
    owned: 412,
    missing: 890,
    coveragePct: 32,
    exhibitDepthPct: null,
    activeMission: null,
    status: "Uncharted",
  },
  {
    id: "1960s",
    label: "1960s",
    slug: null,
    owned: 624,
    missing: 712,
    coveragePct: 47,
    exhibitDepthPct: null,
    activeMission: "Fortify Brown Eyed Girl",
    status: "Active",
  },
  {
    id: "1970s",
    label: "1970s",
    slug: "1970s",
    owned: 581,
    missing: 779,
    coveragePct: 43,
    exhibitDepthPct: 65,
    activeMission: "Conquer Rhiannon",
    status: "Deploy Ready",
    emphasized: true,
  },
  {
    id: "1980s",
    label: "1980s",
    slug: null,
    owned: 498,
    missing: 801,
    coveragePct: 38,
    exhibitDepthPct: null,
    activeMission: "Scout Take On Me",
    status: "Active",
  },
  {
    id: "1990s",
    label: "1990s",
    slug: null,
    owned: 356,
    missing: 645,
    coveragePct: 36,
    exhibitDepthPct: null,
    activeMission: null,
    status: "Quiet",
  },
  {
    id: "2000s",
    label: "2000s",
    slug: null,
    owned: 289,
    missing: 520,
    coveragePct: 36,
    exhibitDepthPct: null,
    activeMission: null,
    status: "Uncharted",
  },
];

export function worldMapRollup(territories: TerritoryCard[]) {
  const owned = territories.reduce((sum, t) => sum + t.owned, 0);
  const missing = territories.reduce((sum, t) => sum + t.missing, 0);
  const coveragePct = Math.round((owned / (owned + missing)) * 100);
  return { owned, missing, coveragePct };
}
