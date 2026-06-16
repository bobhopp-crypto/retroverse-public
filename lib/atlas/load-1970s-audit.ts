import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AtlasMission, CampaignBar, Territory1970sData } from "./types";

type AuditRow = {
  artist: string;
  title: string;
  rvtr: string;
  playCount: number;
  completenessPct: number;
  enrichmentPriority: number;
};

type AuditFile = {
  summary: {
    matchedVideos: number;
    uniqueRvtr: number;
    avgCompletenessPct: number;
    completenessBuckets: { high: number; mid: number; low: number };
  };
  top100: AuditRow[];
};

const SHELF_TOTAL = 1360;

const CAMPAIGNS: CampaignBar[] = [
  { key: "covers", label: "Covers", pct: 85 },
  { key: "albums", label: "Albums", pct: 77 },
  { key: "commentary", label: "Commentary", pct: 0 },
  { key: "tv", label: "TV", pct: 0 },
  { key: "movies", label: "Movies", pct: 0 },
];

function missionVerb(priority: number, completenessPct: number, rank: number): AtlasMission["verb"] {
  if (rank === 1) return "Conquer";
  if (completenessPct >= 50) return "Fortify";
  return "Scout";
}

function toMission(row: AuditRow, rank: number): AtlasMission {
  return {
    rank,
    verb: missionVerb(row.enrichmentPriority, row.completenessPct, rank),
    artist: row.artist,
    title: row.title,
    rvtr: row.rvtr,
    playCount: row.playCount,
    completenessPct: row.completenessPct,
    priority: Math.round(row.enrichmentPriority * 10) / 10,
    active: rank === 1,
  };
}

export async function load1970sAudit(): Promise<Territory1970sData> {
  const path = join(process.cwd(), "reports/1970s-performance-universe-audit.json");
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw) as AuditFile;
  const { summary, top100 } = data;
  const owned = summary.matchedVideos;
  const missing = SHELF_TOTAL - owned;
  const partial = summary.completenessBuckets.mid + summary.completenessBuckets.low;

  return {
    owned,
    missing,
    totalOnShelf: SHELF_TOTAL,
    mappedPct: summary.avgCompletenessPct,
    complete: summary.completenessBuckets.high,
    partial,
    uniqueRvtr: summary.uniqueRvtr,
    campaigns: CAMPAIGNS,
    missions: top100.slice(0, 3).map((row, i) => toMission(row, i + 1)),
    discoveries: [
      "Rhiannon entered Hot 100 orbit",
      "Night Moves cover verified",
      "Black Betty tags added",
    ],
  };
}
