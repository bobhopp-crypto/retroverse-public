import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveAtlasCoverMap } from "./resolve-covers";
import { load1970sAudit } from "./load-1970s-audit";
import {
  albumWritesEnabled,
  buildActionableGaps,
  buildDeferredSlots,
  buildSealsFromLive,
  loadCommentaryState,
  loadMissionAlbumCandidates,
  loadMissionLiveScores,
  loadMissionMediaResearch,
  missionPointsFromGaps,
} from "./mission-live-state";
import {
  albumResearchHeadline,
} from "./mission-research";
import { mediaResearchHeadline } from "./mission-media-research";
import { loadMissionAppearancesStore } from "./mission-appearances-store";
import {
  logMissionNullFields,
  logMissionNullSkip,
  normArtistKey,
  normRvtrId,
  normText,
} from "./mission-safe";
import type { AtlasMission } from "./types";
import type {
  AuditFileFull,
  AuditMissionRow,
  MissionDetail,
  MissionStatusStamp,
  MissionWorkspace,
} from "./mission-types";

const AUDIT_PATH = join(process.cwd(), "reports/1970s-performance-universe-audit.json");
const TERRITORY = "1970s";
const TERRITORY_HREF = "/ops/atlas/1970s";
const SHELF_TOTAL = 1360;

let auditCache: AuditFileFull | null = null;

async function loadAuditFile(): Promise<AuditFileFull> {
  if (auditCache) return auditCache;
  const raw = await readFile(AUDIT_PATH, "utf8");
  auditCache = JSON.parse(raw) as AuditFileFull;
  return auditCache;
}

function missionVerb(completenessPct: number, rank: number): AtlasMission["verb"] {
  if (rank === 1) return "Conquer";
  if (completenessPct >= 50) return "Fortify";
  return "Scout";
}

function toAtlasMission(row: AuditMissionRow, rank: number): AtlasMission | null {
  const rvtrId = normRvtrId(row.rvtr);
  if (!rvtrId) {
    logMissionNullSkip("toAtlasMission", "rvtr", row.rvtr);
    return null;
  }
  const playCount = row.playCount ?? 0;
  return {
    rank,
    verb: missionVerb(row.completenessPct, rank),
    artist: normText(row.artist, "Unknown artist"),
    title: normText(row.title, "Unknown title"),
    rvtr: rvtrId,
    playCount,
    completenessPct: row.completenessPct,
    priority: Math.round(row.enrichmentPriority * 10) / 10,
    active: rank === 1,
  };
}

function statusStamp(exhibitDepthPct: number, gapsOpen: number): MissionStatusStamp {
  if (exhibitDepthPct >= 75) return "COMPLETE";
  if (exhibitDepthPct >= 50) return "FORTIFIED";
  if (gapsOpen === 0) return "IN PROGRESS";
  if (gapsOpen === 1) return "IN PROGRESS";
  return "READY";
}

function relatedByArtist(
  audit: AuditFileFull,
  row: AuditMissionRow,
  rvtr: string,
): MissionWorkspace["relatedByArtist"] {
  const artistKey = normArtistKey(row.artist);
  const seen = new Set<string>([rvtr]);
  const matches: MissionWorkspace["relatedByArtist"] = [];

  for (const candidate of audit.rows) {
    const id = normRvtrId(candidate.rvtr);
    if (!id) continue;
    if (seen.has(id)) continue;
    if (normArtistKey(candidate.artist) !== artistKey) continue;
    seen.add(id);
    matches.push({
      rvtr: id,
      title: normText(candidate.title, "Unknown title"),
      artist: normText(candidate.artist, "Unknown artist"),
      playCount: candidate.playCount ?? 0,
      completenessPct: candidate.completenessPct ?? 0,
    });
  }

  return matches.sort((a, b) => b.playCount - a.playCount).slice(0, 6);
}

function territoryMappedAfter(currentMapped: number, exhibitDepthPct: number): number {
  if (exhibitDepthPct >= 75) return Math.min(100, currentMapped + 1);
  const lift = Math.max(0.5, Math.round((exhibitDepthPct / 100) * 10) / 10);
  return Math.min(100, Math.round((currentMapped + lift) * 10) / 10);
}

export async function findAuditMissionRow(rvtrParam: string): Promise<AuditMissionRow | null> {
  const rvtr = normRvtrId(rvtrParam);
  if (!rvtr) return null;
  const audit = await loadAuditFile();
  return (
    audit.rows.find((r) => normRvtrId(r.rvtr) === rvtr) ??
    audit.top100.find((r) => normRvtrId(r.rvtr) === rvtr) ??
    null
  );
}

export async function loadMissionWorkspace(rvtrParam: string): Promise<MissionWorkspace | null> {
  const rvtr = normRvtrId(rvtrParam);
  if (!rvtr) return null;

  const [audit, territory, row] = await Promise.all([
    loadAuditFile(),
    load1970sAudit(),
    findAuditMissionRow(rvtrParam),
  ]);
  if (!row) return null;

  logMissionNullFields(rvtr, row as unknown as Record<string, unknown>, "audit row");

  const ranked = audit.top100
    .map((r, i) => toAtlasMission(r, i + 1))
    .filter((m): m is AtlasMission => m != null);
  const rankIndex = ranked.findIndex((m) => m.rvtr === rvtr);
  const rank = rankIndex >= 0 ? ranked[rankIndex]!.rank : 0;

  const [live, albumCandidates, appearanceStore, tvCandidates, movieCandidates] =
    await Promise.all([
      loadMissionLiveScores(rvtr, row),
      loadMissionAlbumCandidates(rvtr, 3),
      loadMissionAppearancesStore(),
      loadMissionMediaResearch({ rvtr, row, kind: "tv" }),
      loadMissionMediaResearch({ rvtr, row, kind: "movie" }),
    ]);

  const gaps = buildActionableGaps(live, row, rvtr, appearanceStore);
  const deferredSlots = buildDeferredSlots(row, live);
  const seals = buildSealsFromLive(rvtr, row, live, appearanceStore);
  const commentary = loadCommentaryState(row, live, live.vdjUser2);
  const { earned, available } = missionPointsFromGaps(gaps, seals);
  const owned = audit.summary.matchedVideos;
  const shelfCoveragePct = Math.round((owned / SHELF_TOTAL) * 100);
  const mappedPct = audit.summary.avgCompletenessPct;

  return {
    rvtr,
    artist: normText(row.artist, "Unknown artist"),
    title: normText(row.title, "Unknown title"),
    territory: TERRITORY,
    territoryHref: TERRITORY_HREF,
    performanceYear: row.performanceYear ?? null,
    peakHot100: row.peakHot100 ?? null,
    playCount: row.playCount ?? 0,
    mediaId: normText(row.mediaId),
    filePath: normText(row.path),
    shelfCoveragePct,
    priority: Math.round((row.enrichmentPriority ?? 0) * 10) / 10,
    rank: rank || 0,
    totalRanked: ranked.length,
    exhibitDepthPct: live.exhibitDepthPct,
    status: statusStamp(live.exhibitDepthPct, gaps.length),
    verb: missionVerb(live.exhibitDepthPct, rank || 99),
    gaps,
    deferredSlots,
    seals,
    albumCandidates,
    albumResearchHeadline: albumResearchHeadline(albumCandidates),
    commentary,
    tvCandidates,
    tvResearchHeadline: mediaResearchHeadline("tv", tvCandidates),
    movieCandidates,
    movieResearchHeadline: mediaResearchHeadline("movie", movieCandidates),
    researchBrief:
      gaps.length > 0
        ? {
            headline: "Retroverse did the research — review and approve each slot.",
            slotCount: gaps.length,
          }
        : null,
    albumWritesEnabled: albumWritesEnabled(),
    relatedByArtist: relatedByArtist(audit, row, rvtr),
    discoveries: territory.discoveries ?? [],
    campaigns: territory.campaigns ?? [],
    pointsEarned: earned,
    pointsAvailable: available,
    completeBonus: 10,
    territoryMappedPct: mappedPct,
    territoryMappedAfterPct: territoryMappedAfter(mappedPct, live.exhibitDepthPct),
    prev: rankIndex > 0 ? ranked[rankIndex - 1]! : null,
    next: rankIndex >= 0 && rankIndex < ranked.length - 1 ? ranked[rankIndex + 1]! : null,
  };
}

export async function loadMissionWorkspaceBundle(rvtrParam: string): Promise<{
  workspace: MissionWorkspace;
  coverUrl: string | null;
} | null> {
  const workspace = await loadMissionWorkspace(rvtrParam);
  if (!workspace) return null;
  const coverMap = await resolveAtlasCoverMap([workspace.rvtr]);
  return { workspace, coverUrl: coverMap[workspace.rvtr] ?? null };
}

/** @deprecated Use loadMissionWorkspace */
export async function loadMissionDetail(rvtrParam: string): Promise<MissionDetail | null> {
  const ws = await loadMissionWorkspace(rvtrParam);
  if (!ws) return null;
  return {
    rvtr: ws.rvtr,
    artist: ws.artist,
    title: ws.title,
    territory: ws.territory,
    territoryHref: ws.territoryHref,
    performanceYear: ws.performanceYear,
    playCount: ws.playCount,
    coveragePct: ws.shelfCoveragePct,
    priority: ws.priority,
    rank: ws.rank,
    totalRanked: ws.totalRanked,
    completenessPct: ws.exhibitDepthPct,
    status: ws.status,
    verb: ws.verb,
    checklist: [],
    checklistDone: ws.seals.length,
    checklistTotal: ws.seals.length + ws.gaps.length,
    pointsEarned: ws.pointsEarned,
    pointsAvailable: ws.pointsAvailable,
    completeBonus: ws.completeBonus,
    territoryMappedPct: ws.territoryMappedPct,
    territoryMappedAfterPct: ws.territoryMappedAfterPct,
    prev: ws.prev,
    next: ws.next,
  };
}
