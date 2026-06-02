import { loadYearMatchSection } from "@/lib/ops/load-year-match-section";
import {
  loadChartTrackIdsInPerformanceUniverse,
  loadVdjPerformanceUniverse,
} from "@/lib/ops/load-vdj-performance-universe";
import type { YearMatchRow } from "@/lib/ops/reconciliation-model";

import { normalizeGraphTrackId } from "./year-workspace/graph-track-id";
import { chartWorkspaceKey, mediaWorkspaceKey } from "./year-workspace/keys";
import { keywordsForKey, loadYearWorkspaceState } from "./year-workspace/state";
import type { YearWorkspaceData, YearWorkspaceRow } from "./year-workspace/types";

function chartRowToWorkspace(
  row: YearMatchRow,
  bucket: "in_both" | "chart_only",
  keywords: YearWorkspaceRow["keywords"],
): YearWorkspaceRow {
  const graphTrackId = normalizeGraphTrackId(row.graphTrackId);
  const workspaceKey = chartWorkspaceKey(graphTrackId!);
  return {
    id: `ws-${row.id}`,
    workspaceKey,
    bucket,
    artist: row.artist,
    title: row.title,
    matchStatus: row.matchStatus,
    peak: row.peak,
    weeks: row.weeks,
    keywords,
    chartItemId: row.chartItemId,
    graphTrackId,
    rvtr: row.rvtr,
    mediaId: row.mediaId,
    vdjLabel: row.bestMatch ?? row.label,
    vdjYear: row.vdjYear,
    sourcePath: null,
    bestMatch: row.bestMatch,
  };
}

export async function loadYearWorkspace(year: number): Promise<YearWorkspaceData> {
  const [chartRows, vdjRows, keywordState] = await Promise.all([
    loadYearMatchSection(year),
    loadVdjPerformanceUniverse(year),
    loadYearWorkspaceState(year),
  ]);

  const graphTrackIds = chartRows
    .map((r) => normalizeGraphTrackId(r.graphTrackId))
    .filter((id): id is number => id != null);
  const chartTrackIdSet = new Set(graphTrackIds);
  const inPerformanceUniverse = await loadChartTrackIdsInPerformanceUniverse(
    year,
    graphTrackIds,
  );

  const inBoth: YearWorkspaceRow[] = [];
  const chartOnly: YearWorkspaceRow[] = [];

  for (const row of chartRows) {
    const graphTrackId = normalizeGraphTrackId(row.graphTrackId);
    if (graphTrackId == null) continue;
    const inPerf = inPerformanceUniverse.has(graphTrackId);
    const key = chartWorkspaceKey(graphTrackId);
    const keywords = keywordsForKey(keywordState, key);
    if (inPerf) {
      inBoth.push(chartRowToWorkspace(row, "in_both", keywords));
    } else {
      chartOnly.push(chartRowToWorkspace(row, "chart_only", keywords));
    }
  }

  const vdjOnly: YearWorkspaceRow[] = [];
  for (const media of vdjRows) {
    const mediaGraphId = normalizeGraphTrackId(media.graphTrackId);
    if (mediaGraphId != null && chartTrackIdSet.has(mediaGraphId)) {
      continue;
    }
    const workspaceKey = mediaWorkspaceKey(media.mediaId);
    vdjOnly.push({
      id: `ws-media-${media.mediaId}`,
      workspaceKey,
      bucket: "vdj_only",
      artist: media.artist,
      title: media.title,
      matchStatus: "missing",
      peak: null,
      weeks: null,
      keywords: keywordsForKey(keywordState, workspaceKey),
      chartItemId: null,
      graphTrackId: mediaGraphId,
      rvtr: null,
      mediaId: media.mediaId,
      vdjLabel: media.label,
      vdjYear: media.vdjYear,
      sourcePath: media.sourcePath,
      bestMatch: media.label,
    });
  }

  const sortChart = (a: YearWorkspaceRow, b: YearWorkspaceRow) => {
    const pa = a.peak ?? 999;
    const pb = b.peak ?? 999;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  };

  inBoth.sort(sortChart);
  chartOnly.sort(sortChart);
  vdjOnly.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));

  return {
    year,
    stats: {
      billboardTotal: chartRows.length,
      vdjTotal: vdjRows.length,
      inBoth: inBoth.length,
      chartOnly: chartOnly.length,
      vdjOnly: vdjOnly.length,
    },
    inBoth,
    chartOnly,
    vdjOnly,
  };
}
