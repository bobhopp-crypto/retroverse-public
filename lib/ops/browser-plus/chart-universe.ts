import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import type { ChartUniverseCoverageReport } from "@/lib/charts/load-coverage-summary";
import { loadChartUniverseCoverageReport } from "@/lib/charts/load-coverage-summary";

import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

import type { BrowserPlusModel, BrowserPlusRow } from "./types";

const MY_VIDEO_PATH = /\/DJ MEDIA\/VIDEO\//i;
const VIDEO_VAULT_PATH = /\/DJ MEDIA\/VIDEO VAULT\//i;

export function isMyVideoLibraryPath(filePath: string): boolean {
  return MY_VIDEO_PATH.test(filePath) && !VIDEO_VAULT_PATH.test(filePath);
}

type ChartTrackRow = {
  rvtr: string;
  has_hot100: boolean;
  peak_hot100_position: number | null;
  canonical_title: string;
  canonical_artist_name: string;
  chart_year: number | null;
};

export type ChartUniverseIndex = {
  hot100Rvtrs: Set<string>;
  byRvtr: Map<string, ChartTrackRow>;
};

export async function loadChartUniverseIndex(): Promise<ChartUniverseIndex> {
  const rows = await inspectQuery<ChartTrackRow>(
    `
    SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
           coalesce(has_hot100, false) AS has_hot100,
           peak_hot100_position,
           canonical_title,
           canonical_artist_name,
           CASE
             WHEN first_chart_date IS NOT NULL THEN extract(year FROM first_chart_date)::int
             ELSE NULL
           END AS chart_year
    FROM canonical_track_display
    WHERE coalesce(retroverse_track_id, track_id) ~* '^RVTR[0-9]{6}$'
    `,
  );

  const hot100Rvtrs = new Set<string>();
  const byRvtr = new Map<string, ChartTrackRow>();
  for (const row of rows) {
    byRvtr.set(row.rvtr.toUpperCase(), row);
    if (row.has_hot100) hot100Rvtrs.add(row.rvtr.toUpperCase());
  }
  return { hot100Rvtrs, byRvtr };
}

export function videoRvtrSet(rows: BrowserPlusRow[]): Set<string> {
  const out = new Set<string>();
  for (const row of rows) {
    if (!row.rvtr || !isMyVideoLibraryPath(row.filePath)) continue;
    out.add(row.rvtr.toUpperCase());
  }
  return out;
}

export function buildGapRows(
  chartIndex: ChartUniverseIndex,
  coveredRvtrs: Set<string>,
  coverageByRvtr?: Map<string, TrackCoverageStatus>,
): BrowserPlusRow[] {
  const gaps: BrowserPlusRow[] = [];
  for (const rvtr of chartIndex.hot100Rvtrs) {
    if (coveredRvtrs.has(rvtr)) continue;
    const track = chartIndex.byRvtr.get(rvtr);
    if (!track) continue;
    const coverageStatus = coverageByRvtr?.get(rvtr) ?? "missing";
    const coverageFlags = ["MISSING", "HOT100"];
    if (coverageStatus === "youtube") coverageFlags.push("YOUTUBE");
    if (coverageStatus === "missing") coverageFlags.push("NO_VIDEO");
    gaps.push({
      id: `gap:${rvtr}`,
      filePath: "",
      fileName: "",
      fileType: "GAP",
      folderPath: ["Missing"],
      folderKey: "Missing",
      mediaKind: "other",
      artist: track.canonical_artist_name,
      title: track.canonical_title,
      album: "",
      genre: "",
      year: track.chart_year,
      bpm: null,
      key: "",
      lengthSeconds: null,
      playCount: null,
      firstSeen: null,
      firstPlay: null,
      lastPlay: null,
      label: "",
      grouping: "",
      user1: "",
      user2: "",
      rvTags: "",
      rvtr,
      matchMethod: "Chart Orbit",
      packageStatus: "Missing Package",
      deckStatus: "No Package",
      coverStatus: "Missing Cover",
      thumbnailStatus: "Video Missing",
      thumbnailPath: null,
      thumbnailUrl: null,
      thumbnailSource: "Missing",
      workStatus: "Missing RVTR",
      workStatusReason:
        coverageStatus === "youtube"
          ? "Hot 100 chart track — YouTube available, no owned VIDEO file"
          : "Hot 100 chart track with no owned VIDEO file",
      coverageScore: 0,
      canonicalArtist: track.canonical_artist_name,
      canonicalTrack: track.canonical_title,
      lastGenerated: null,
      lastPublished: null,
      coverageFlags,
      poiCount: 0,
      linkCount: 0,
      hasVdjCover: false,
      hasCover: false,
      hasRetroverseCover: false,
      retroverseCoverUrl: null,
      fileExists: false,
      isVideo: false,
      searchText: `${track.canonical_artist_name} ${track.canonical_title} ${rvtr} missing hot100 ${coverageStatus}`.toLowerCase(),
    });
  }
  return gaps.sort((a, b) => {
    const ap = chartIndex.byRvtr.get(a.rvtr ?? "")?.peak_hot100_position ?? 999;
    const bp = chartIndex.byRvtr.get(b.rvtr ?? "")?.peak_hot100_position ?? 999;
    return ap - bp;
  });
}

export type BrowserPlusChartEnrichment = {
  gapRows: BrowserPlusRow[];
  hot100RvtrCount: number;
  videoHot100Count: number;
  gapCount: number;
};

export async function enrichBrowserPlusChartCoverage(
  rows: BrowserPlusRow[],
): Promise<BrowserPlusChartEnrichment & { chartIndex: ChartUniverseIndex; collectionCoverage: ChartUniverseCoverageReport }> {
  const [chartIndex, collectionCoverage] = await Promise.all([
    loadChartUniverseIndex(),
    loadChartUniverseCoverageReport(),
  ]);
  const coveredRvtrs = videoRvtrSet(rows);
  const missingRvtrs = [...chartIndex.hot100Rvtrs].filter((rvtr) => !coveredRvtrs.has(rvtr));
  const coverageByRvtr = await loadTrackCoverageByRvtr(missingRvtrs);
  const gapRows = buildGapRows(chartIndex, coveredRvtrs, coverageByRvtr);
  let videoHot100Count = 0;
  for (const rvtr of coveredRvtrs) {
    if (chartIndex.hot100Rvtrs.has(rvtr)) videoHot100Count += 1;
  }
  return {
    gapRows,
    hot100RvtrCount: chartIndex.hot100Rvtrs.size,
    videoHot100Count,
    gapCount: gapRows.length,
    chartIndex,
    collectionCoverage,
  };
}

export async function attachBrowserPlusChartCoverage(model: BrowserPlusModel): Promise<BrowserPlusModel> {
  const enriched = await enrichBrowserPlusChartCoverage(model.rows);
  for (const row of model.rows) {
    if (!row.rvtr) continue;
    if (enriched.chartIndex.hot100Rvtrs.has(row.rvtr.toUpperCase())) {
      if (!row.coverageFlags.includes("HOT100")) {
        row.coverageFlags = [...row.coverageFlags, "HOT100"];
      }
    }
  }
  const myVideoRows = model.rows.filter((row) => isMyVideoLibraryPath(row.filePath));
  const myVideoRvtrs = new Set(
    myVideoRows.flatMap((row) => (row.rvtr ? [row.rvtr.toUpperCase()] : [])),
  );
  return {
    ...model,
    gapRows: enriched.gapRows,
    chartCoverage: {
      hot100RvtrCount: enriched.hot100RvtrCount,
      videoHot100Count: enriched.videoHot100Count,
      gapCount: enriched.gapCount,
      myVideoRows: myVideoRows.length,
      myVideoRvtrs: myVideoRvtrs.size,
    },
    collectionCoverage: enriched.collectionCoverage,
  };
}
