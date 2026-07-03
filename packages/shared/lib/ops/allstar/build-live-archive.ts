import "server-only";

import { existsSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

import { allstarArchiveDir, allstarActivityPath, allstarLiveStatePath } from "./paths";
import { playerSpotlightMeta } from "./player-facts";
import { buildCollectionHarvestMetrics } from "./harvest-metrics";
import type {
  AllStarArchiveRecord,
  AllStarCollectionGroup,
  AllStarDisc,
  AllStarFinding,
  AllStarLeaderboardEntry,
  AllStarLiveArchive,
  AllStarLiveProcessing,
  AllStarSnapshot,
  AllStarTickerEvent,
} from "./types";
import { ALLSTAR_OUTCOME_GROUPS, buildOutcomeSummary } from "./types";

type LiveStateFile = {
  extractionRunning?: boolean;
  current?: AllStarLiveProcessing;
};

function outcomeProbability(
  probabilities: AllStarArchiveRecord["probabilities"],
  key: (typeof ALLSTAR_OUTCOME_GROUPS)[number]["key"],
): number {
  const group = ALLSTAR_OUTCOME_GROUPS.find((g) => g.key === key);
  if (!group) return 0;
  return group.numbers.reduce((sum, n) => sum + (probabilities[n] ?? 0), 0);
}

function buildLeaderboard(
  records: AllStarArchiveRecord[],
  key: (typeof ALLSTAR_OUTCOME_GROUPS)[number]["key"],
  label: string,
): AllStarLeaderboardEntry[] {
  return records
    .map((record) => ({
      player: record.player,
      position: record.position,
      discId: record.id,
      value: outcomeProbability(record.probabilities, key),
      label,
    }))
    .filter((entry) => entry.value > 0 && entry.player)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function buildFindings(records: AllStarArchiveRecord[]): AllStarFinding[] {
  if (!records.length) return [];

  const findings: AllStarFinding[] = [];
  const byDate = [...records].sort(
    (a, b) => new Date(a.preservedAt).getTime() - new Date(b.preservedAt).getTime(),
  );

  const topHr = [...records].sort(
    (a, b) => outcomeProbability(b.probabilities, "homeRun") - outcomeProbability(a.probabilities, "homeRun"),
  )[0];
  if (topHr) {
    findings.push({
      id: "top-hr",
      title: "Highest HR rate found",
      detail: `${(outcomeProbability(topHr.probabilities, "homeRun") * 100).toFixed(2)}% home run wedge`,
      player: topHr.player,
      discId: topHr.id,
      at: topHr.preservedAt,
    });
  }

  const topBb = [...records].sort(
    (a, b) => outcomeProbability(b.probabilities, "walk") - outcomeProbability(a.probabilities, "walk"),
  )[0];
  if (topBb) {
    findings.push({
      id: "top-bb",
      title: "Highest BB rate found",
      detail: `${(outcomeProbability(topBb.probabilities, "walk") * 100).toFixed(2)}% walk probability`,
      player: topBb.player,
      discId: topBb.id,
      at: topBb.preservedAt,
    });
  }

  const firstHof = byDate.find((r) => r.hallOfFame);
  if (firstHof) {
    findings.push({
      id: "first-hof",
      title: "First Hall of Famer processed",
      detail: firstHof.hofYear
        ? `Inducted ${firstHof.hofYear} · now preserved in the archive`
        : "Hall of Fame disc added to the living archive",
      player: firstHof.player,
      discId: firstHof.id,
      at: firstHof.preservedAt,
    });
  }

  const firstSwitch = byDate.find((r) => r.switchHitter);
  if (firstSwitch) {
    findings.push({
      id: "first-switch",
      title: "First switch hitter processed",
      detail: `${firstSwitch.position} · multi-position disc preserved`,
      player: firstSwitch.player,
      discId: firstSwitch.id,
      at: firstSwitch.preservedAt,
    });
  }

  const largestWedge = [...records].sort((a, b) => b.largestOutcomeDegrees - a.largestOutcomeDegrees)[0];
  if (largestWedge) {
    findings.push({
      id: "largest-wedge",
      title: "Largest single wedge found",
      detail: `${largestWedge.largestOutcomeDegrees.toFixed(1)}° on one outcome slot`,
      player: largestWedge.player,
      discId: largestWedge.id,
      at: largestWedge.preservedAt,
    });
  }

  const hrWedges = records.filter((r) => r.smallestHomeRunDegrees != null);
  const smallestHr = hrWedges.sort(
    (a, b) => (a.smallestHomeRunDegrees ?? 999) - (b.smallestHomeRunDegrees ?? 999),
  )[0];
  if (smallestHr?.smallestHomeRunDegrees != null) {
    findings.push({
      id: "smallest-hr",
      title: "Smallest HR wedge found",
      detail: `Only ${smallestHr.smallestHomeRunDegrees.toFixed(1)}° for a home run slot`,
      player: smallestHr.player,
      discId: smallestHr.id,
      at: smallestHr.preservedAt,
    });
  }

  return findings.slice(0, 8);
}

function collectionOverview(
  snapshot: AllStarSnapshot,
  records: AllStarArchiveRecord[],
): AllStarLiveArchive["collectionOverview"] {
  const groups: Array<{ key: AllStarCollectionGroup; label: string }> = [
    { key: "hallOfFame", label: "Hall of Fame Set" },
    { key: "active", label: "Active Player Sets" },
    { key: "unknown", label: "Unknown / Unclassified" },
  ];

  const pending = snapshot.discs.filter((d) => d.processingStatus === "pending").length;

  return groups.map((group) => {
    let total = 0;
    let preserved = 0;

    if (group.key === "hallOfFame") {
      total = snapshot.discs.filter(
        (d) => records.find((r) => r.id === d.id)?.hallOfFame || d.processingStatus === "pending",
      ).length;
      preserved = records.filter((r) => r.collectionGroup === "hallOfFame").length;
    } else if (group.key === "active") {
      total = snapshot.discs.filter((d) => d.processingStatus !== "pending").length + pending;
      preserved = records.filter((r) => r.collectionGroup === "active").length;
    } else {
      total = pending;
      preserved = 0;
    }

    return {
      key: group.key,
      label: group.label,
      total: Math.max(total, preserved),
      preserved,
      percent: total > 0 ? Math.round((preserved / total) * 100) : 0,
    };
  });
}

export async function loadArchiveRecords(): Promise<AllStarArchiveRecord[]> {
  const dir = allstarArchiveDir();
  if (!existsSync(dir)) return [];

  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const records: AllStarArchiveRecord[] = [];

  for (const file of files) {
    try {
      const raw = await readFile(join(dir, file), "utf8");
      records.push(JSON.parse(raw) as AllStarArchiveRecord);
    } catch {
      /* skip corrupt record */
    }
  }

  return records.sort(
    (a, b) => new Date(b.preservedAt).getTime() - new Date(a.preservedAt).getTime(),
  );
}

async function loadLiveState(): Promise<LiveStateFile> {
  const path = allstarLiveStatePath();
  if (!existsSync(path)) return { extractionRunning: false };
  try {
    return JSON.parse(await readFile(path, "utf8")) as LiveStateFile;
  } catch {
    return { extractionRunning: false };
  }
}

async function loadTicker(limit = 24): Promise<AllStarTickerEvent[]> {
  const path = allstarActivityPath();
  if (!existsSync(path)) return [];
  const raw = await readFile(path, "utf8");
  const lines = raw.split(/\n/).filter(Boolean);
  return lines
    .slice(-limit)
    .map((line, index) => {
      try {
        const parsed = JSON.parse(line) as { message: string; at: string };
        return {
          id: `${index}-${parsed.at}`,
          message: parsed.message,
          at: parsed.at,
        };
      } catch {
        return null;
      }
    })
    .filter((event): event is AllStarTickerEvent => event != null)
    .reverse();
}

function archiveFromDisc(disc: AllStarDisc): AllStarArchiveRecord | null {
  if (disc.processingStatus !== "processed" && disc.processingStatus !== "ocr_partial") return null;
  if (!disc.player.trim()) return null;

  const outcomeSummary = buildOutcomeSummary(disc.degrees, disc.probabilities);
  const largestOutcomeDegrees = Math.max(...Object.values(disc.degrees), 0);
  const hrDeg = disc.degrees["1"] ?? 0;

  return {
    id: disc.id,
    sourceFile: disc.scanFilename,
    canonicalFile: disc.canonicalFile,
    player: disc.player,
    position: disc.position,
    preservedAt: new Date().toISOString(),
    hallOfFame: false,
    hofYear: null,
    switchHitter: /1st base/i.test(disc.position) && /2nd base/i.test(disc.position),
    collectionGroup: "active",
    geometryStatus: disc.geometryStatus,
    ocrStatus: disc.processingStatus === "processed" ? "complete" : "partial",
    validationStatus:
      disc.geometryStatus === "ok" && disc.processingStatus === "processed" ? "validated" : "warning",
    degrees: disc.degrees,
    probabilities: disc.probabilities,
    outcomeSummary,
    wedgeCount: disc.wedgeCount,
    degreesSum: disc.degreesSum,
    largestOutcomeDegrees,
    smallestHomeRunDegrees: hrDeg > 0 ? hrDeg : null,
    reviewImageFilename: disc.reviewImageFilename,
    warnings: disc.warnings,
  };
}

export async function buildLiveArchive(snapshot: AllStarSnapshot): Promise<AllStarLiveArchive> {
  let records = await loadArchiveRecords();

  if (!records.length) {
    records = snapshot.discs
      .map(archiveFromDisc)
      .filter((record): record is AllStarArchiveRecord => record != null);
  }

  const liveState = await loadLiveState();
  const ticker = await loadTicker();

  const hofRecords = records.filter((r) => r.hallOfFame);
  const recentHof = hofRecords[0];

  const recentlyPreserved = records.slice(0, 8).map((record) => ({
    id: record.id,
    player: record.player,
    position: record.position,
    preservedAt: record.preservedAt,
    hallOfFame: record.hallOfFame,
    thumbnailUrl: `/api/ops/allstar/image?kind=review&id=${encodeURIComponent(record.id)}`,
  }));

  const spotlightRecord =
    records.length > 0
      ? records[Math.floor(Math.random() * Math.min(records.length, 6))]
      : null;

  const spotlight = spotlightRecord
    ? {
        id: spotlightRecord.id,
        player: spotlightRecord.player,
        position: spotlightRecord.position,
        ...playerSpotlightMeta(spotlightRecord.player),
        homeRunProbability: outcomeProbability(spotlightRecord.probabilities, "homeRun"),
      }
    : null;

  const harvest = await buildCollectionHarvestMetrics();

  return {
    updatedAt: new Date().toISOString(),
    extractionRunning: liveState.extractionRunning ?? false,
    liveProcessing: liveState.current ?? null,
    ticker,
    recentlyPreserved,
    hallOfFame: {
      totalIdentified: hofRecords.length + snapshot.discs.filter((d) => d.processingStatus === "pending").length,
      preserved: hofRecords.length,
      percent:
        hofRecords.length > 0
          ? Math.round((hofRecords.length / Math.max(hofRecords.length, snapshot.stats.totalScans)) * 100)
          : 0,
      recentPlayer: recentHof?.player ?? null,
      recentPreservedAt: recentHof?.preservedAt ?? null,
    },
    leaderboards: {
      homeRun: buildLeaderboard(records, "homeRun", "Home Run"),
      walk: buildLeaderboard(records, "walk", "Walk"),
      strikeout: buildLeaderboard(records, "strikeout", "Strikeout"),
      singles: buildLeaderboard(records, "singles", "Singles"),
      double: buildLeaderboard(records, "double", "Double"),
    },
    findings: buildFindings(records),
    spotlight,
    collectionOverview: collectionOverview(snapshot, records),
    stats: snapshot.stats,
    harvest,
  };
}
