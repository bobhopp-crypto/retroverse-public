import { inspectQuery } from "@/lib/inspect/pg";
import { loadYearMatchSection } from "@/lib/ops/load-year-match-section";
import { loadChartTrackIdsInPerformanceUniverse } from "@/lib/ops/load-vdj-performance-universe";
import { opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";
import { loadOpsState } from "@/lib/ops/ops-state-store";
import { vdjPerformanceYearSql } from "@/lib/ops/vdj-performance-filter";
import { parseVdjMetadataYear } from "@/lib/ops/year-authority";

export type ExclusionCategory =
  | "performance_year_mismatch"
  | "decade_folder_mismatch"
  | "performance_year_and_folder_mismatch"
  | "no_media_track_link"
  | "no_ops_video_link"
  | "video_universe_filter_exclusion"
  | "missing_rvtr"
  | "manual_override_without_performance_link"
  | "workspace_set_type_coercion_bug"
  | "other";

export type InBothAuditRow = {
  billboardTitle: string;
  billboardArtist: string;
  graphTrackId: number;
  rvtr: string | null;
  yearMatchStatus: string;
  vdjPerformanceUniverseStatus: "in_performance_universe" | "excluded";
  workspaceBucket: "in_both" | "chart_only" | "vdj_only";
  workspaceBucketCorrect: "in_both" | "chart_only";
  exclusionCategory: ExclusionCategory;
  reasonExcludedFromInBoth: string;
  hasOpsVideoLink: boolean;
  manualOverride: boolean;
  linkedMediaCount: number;
  bestMatchLabel: string | null;
  bestMatchYearText: string | null;
  bestMatchSourcePath: string | null;
  parsedVdjYear: number | null;
  passesPerformanceYearFilter: boolean;
  passesDecadeFolderFilter: boolean;
  passesOpsVideoFilter: boolean;
};

type MediaLinkRow = {
  media_id: number;
  year_text: string | null;
  source_path: string | null;
  directory_path: string | null;
  filename: string | null;
  file_extension: string | null;
  artist_text: string | null;
  title_text: string | null;
};

const OPS_VIDEO = opsVideoMediaAndClause("ma");

function passesOpsVideo(row: MediaLinkRow): boolean {
  const path = row.source_path ?? row.directory_path ?? row.filename ?? "";
  if (!/\/VIDEO\//i.test(path)) return false;
  const ext = (row.file_extension ?? row.filename ?? "").toLowerCase();
  return /\.(mp4|mkv|mov|avi|m4v)$/.test(ext) || ["mp4", "mkv", "mov", "avi", "m4v"].includes(ext);
}

function passesPerformanceYear(yearText: string | null, targetYear: number): boolean {
  const raw = yearText?.trim() ?? "";
  if (raw === String(targetYear)) return true;
  if (/^[0-9]{4}/.test(raw)) {
    const y = Number.parseInt(raw.slice(0, 4), 10);
    return y === targetYear;
  }
  return false;
}

function passesDecadeFolder(
  sourcePath: string | null,
  directoryPath: string | null,
  targetYear: number,
): boolean {
  const decade = Math.floor(targetYear / 10) * 10;
  const path = `${sourcePath ?? ""} ${directoryPath ?? ""}`;
  const reDecade = new RegExp(`/${decade}s(/|$)`, "i");
  const reDecadeApostrophe = new RegExp(`/${decade}'s(/|$)`, "i");
  const reYear = new RegExp(`/${targetYear}(/|$)`, "i");
  return reDecade.test(path) || reDecadeApostrophe.test(path) || reYear.test(path);
}

function categorizeExclusion(input: {
  manualOverride: boolean;
  hasOpsVideoLink: boolean;
  linkedMediaCount: number;
  rvtr: string | null;
  passesPerformanceYear: boolean;
  passesDecadeFolder: boolean;
  passesOpsVideo: boolean;
  inPerformanceUniverse: boolean;
  workspaceLookupFailedDueToType: boolean;
}): { category: ExclusionCategory; reason: string } {
  if (input.inPerformanceUniverse && input.workspaceLookupFailedDueToType) {
    return {
      category: "workspace_set_type_coercion_bug",
      reason:
        "Track has 1967 performance-universe media link but workspace uses Set.has(string) against numeric Set keys",
    };
  }

  if (input.inPerformanceUniverse) {
    return { category: "other", reason: "Qualifies for In Both" };
  }

  if (input.manualOverride && !input.hasOpsVideoLink) {
    return {
      category: "manual_override_without_performance_link",
      reason: "Manual match override marked matched without ops VIDEO media_track_link",
    };
  }

  if (!input.hasOpsVideoLink) {
    return {
      category: input.manualOverride ? "manual_override_without_performance_link" : "no_ops_video_link",
      reason: input.manualOverride
        ? "Manual match override marked matched without ops VIDEO media_track_link"
        : "Year Match matched via has_vdj_media but no ops VIDEO link on this graph_track_id",
    };
  }

  if (input.linkedMediaCount === 0) {
    return {
      category: "no_media_track_link",
      reason: "No media_track_links rows for graph track",
    };
  }

  if (!input.rvtr) {
    // RVTR missing is informational; exclusion is still filter-based
  }

  if (input.hasOpsVideoLink && !input.passesPerformanceYear && !input.passesDecadeFolder) {
    return {
      category: "performance_year_and_folder_mismatch",
      reason: "Linked ops VIDEO exists but year_text ≠ 1967 and path not under /1960s/ or /1967/",
    };
  }

  if (input.hasOpsVideoLink && !input.passesPerformanceYear) {
    return {
      category: "performance_year_mismatch",
      reason: "Linked ops VIDEO exists but year_text is not classified as performance year 1967",
    };
  }

  if (input.hasOpsVideoLink && !input.passesDecadeFolder) {
    return {
      category: "decade_folder_mismatch",
      reason: "Linked ops VIDEO year_text may be 1967 but path not under /1960s/ or /1967/",
    };
  }

  if (input.hasOpsVideoLink && input.passesPerformanceYear && input.passesDecadeFolder && !input.passesOpsVideo) {
    return {
      category: "video_universe_filter_exclusion",
      reason: "Media link exists but fails ops VIDEO extension/path filter",
    };
  }

  if (!input.rvtr && input.hasOpsVideoLink) {
    return {
      category: "missing_rvtr",
      reason: "Has ops VIDEO link but no RVTR on chart row (does not alone block In Both)",
    };
  }

  return {
    category: "other",
    reason: "Linked media present but failed performance-universe intersection for unknown reason",
  };
}

async function loadMediaLinks(graphTrackIds: number[]): Promise<Map<number, MediaLinkRow[]>> {
  if (graphTrackIds.length === 0) return new Map();

  const rows = await inspectQuery<MediaLinkRow & { graph_track_id: number }>(
    `
    SELECT
      mtl.track_id::int AS graph_track_id,
      ma.id AS media_id,
      ma.year_text,
      ma.source_path,
      ma.directory_path,
      ma.filename,
      ma.file_extension,
      ma.artist_text,
      ma.title_text
    FROM media_track_links mtl
    JOIN media_assets ma ON ma.id = mtl.media_asset_id
    WHERE mtl.track_id = ANY($1::int[])
    ORDER BY mtl.track_id, mtl.confidence_score DESC NULLS LAST, ma.updated_at DESC NULLS LAST
    `,
    [graphTrackIds],
  );

  const map = new Map<number, MediaLinkRow[]>();
  for (const row of rows) {
    const list = map.get(row.graph_track_id) ?? [];
    list.push(row);
    map.set(row.graph_track_id, list);
  }
  return map;
}

async function loadOpsVideoLinkFlags(graphTrackIds: number[]): Promise<Map<number, boolean>> {
  const rows = await inspectQuery<{ graph_track_id: number }>(
    `
    SELECT DISTINCT mtl.track_id::int AS graph_track_id
    FROM media_track_links mtl
    JOIN media_assets ma ON ma.id = mtl.media_asset_id
    WHERE mtl.track_id = ANY($1::int[])
    ${OPS_VIDEO}
    `,
    [graphTrackIds],
  );
  return new Map(rows.map((r) => [r.graph_track_id, true]));
}

export async function auditInBothReconciliation(year = 1967): Promise<InBothAuditRow[]> {
  const [yearMatch, state, inPerformanceUniverse] = await Promise.all([
    loadYearMatchSection(year),
    loadOpsState(),
    loadYearMatchSection(year).then(async (rows) => {
      const ids = rows.map((r) => r.graphTrackId).filter((id): id is number => id != null);
      return loadChartTrackIdsInPerformanceUniverse(year, ids);
    }),
  ]);

  const matched = yearMatch.filter((r) => r.matchStatus === "matched");
  const graphTrackIds = matched
    .map((r) => Number(r.graphTrackId))
    .filter((id) => Number.isFinite(id));

  const [mediaByTrack, opsVideoFlags] = await Promise.all([
    loadMediaLinks(graphTrackIds),
    loadOpsVideoLinkFlags(graphTrackIds),
  ]);

  return matched.map((row) => {
    const graphTrackId = Number(row.graphTrackId);
    const links = mediaByTrack.get(graphTrackId) ?? [];
    const opsVideoLinks = links.filter(passesOpsVideo);
    const hasOpsVideoLink = opsVideoFlags.get(graphTrackId) === true;

    let passesPerfYear = false;
    let passesFolder = false;
    let passesVideo = false;
    let bestLink: MediaLinkRow | null = null;

    for (const link of opsVideoLinks) {
      const py = passesPerformanceYear(link.year_text, year);
      const pf = passesDecadeFolder(link.source_path, link.directory_path, year);
      const pv = passesOpsVideo(link);
      if (py) passesPerfYear = true;
      if (pf) passesFolder = true;
      if (pv) passesVideo = true;
      if (!bestLink) bestLink = link;
      if (py && pf && pv) break;
    }

    // Also check raw SQL performance universe for this track
    const inPerf = inPerformanceUniverse.has(graphTrackId);
    const workspaceLookupRaw = inPerformanceUniverse.has(
      row.graphTrackId as unknown as number,
    );
    const manualOverride = Boolean(state.matchOverrides[row.chartItemId]?.manualOverride);

    const { category, reason } = categorizeExclusion({
      manualOverride,
      hasOpsVideoLink,
      linkedMediaCount: links.length,
      rvtr: row.rvtr,
      passesPerformanceYear: passesPerfYear,
      passesDecadeFolder: passesFolder,
      passesOpsVideo: passesVideo,
      inPerformanceUniverse: inPerf,
      workspaceLookupFailedDueToType: inPerf && !workspaceLookupRaw,
    });

    let finalCategory = category;
    let finalReason = reason;
    if (!row.rvtr && category !== "manual_override_without_performance_link") {
      if (finalCategory === "other") finalCategory = "missing_rvtr";
    }

    const workspaceBucketBuggy = workspaceLookupRaw ? "in_both" : "chart_only";
    const workspaceBucketCorrect = inPerf ? "in_both" : "chart_only";

    return {
      billboardTitle: row.title,
      billboardArtist: row.artist,
      graphTrackId,
      rvtr: row.rvtr,
      yearMatchStatus: row.matchStatus,
      vdjPerformanceUniverseStatus: inPerf ? "in_performance_universe" : "excluded",
      workspaceBucket: workspaceBucketBuggy,
      workspaceBucketCorrect,
      exclusionCategory: finalCategory,
      reasonExcludedFromInBoth:
        workspaceBucketCorrect === "in_both"
          ? ""
          : finalReason,
      hasOpsVideoLink,
      manualOverride,
      linkedMediaCount: links.length,
      bestMatchLabel: row.bestMatch,
      bestMatchYearText: bestLink?.year_text ?? null,
      bestMatchSourcePath: bestLink?.source_path ?? bestLink?.directory_path ?? null,
      parsedVdjYear: parseVdjMetadataYear(bestLink?.year_text ?? null, bestLink?.source_path),
      passesPerformanceYearFilter: passesPerfYear,
      passesDecadeFolderFilter: passesFolder,
      passesOpsVideoFilter: passesVideo || hasOpsVideoLink,
    };
  });
}

export async function summarizeExclusionCategories(rows: InBothAuditRow[]) {
  const counts = new Map<ExclusionCategory, number>();
  for (const row of rows) {
    counts.set(row.exclusionCategory, (counts.get(row.exclusionCategory) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Diagnostic: count tracks that would enter In Both if we used ops-video-only (year match rule). */
export async function countHypotheticalInBothWithOpsVideoOnly(
  year: number,
  graphTrackIds: number[],
): Promise<number> {
  const flags = await loadOpsVideoLinkFlags(graphTrackIds);
  return graphTrackIds.filter((id) => flags.get(id)).length;
}

export function vdjPerformanceYearSqlFragment(year: number): string {
  return vdjPerformanceYearSql(year, "ma");
}
