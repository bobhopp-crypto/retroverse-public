import { readFileSync } from "fs";
import { join } from "path";

import {
  loadActiveYearBridgeIndex,
  type ActiveYearBridge,
} from "@/lib/ops/year-workspace/active-year-connections";
import { loadChartUniverseCount } from "@/lib/ops/year-workspace/chart-universe-count";
import { computeReviewApiMetrics } from "@/lib/ops/year-workspace/enrich-vdj-meta";
import { loadVideoUniverse } from "@/lib/ops/year-workspace/load-video-universe";
import type { YearWorkspaceRow } from "@/lib/ops/year-workspace/types";
import {
  REVIEW_PILOT_ACTIVE_YEARS,
  reviewUniverseEnabledForYear,
} from "@/lib/ops/year-workspace/review-pilot";
import { loadYearWorkspaceState } from "@/lib/ops/year-workspace/state";
import type { YearWorkspaceData } from "@/lib/ops/year-workspace/types";

export type ReviewUniverseUniverses = {
  /** A — VDJ performance videos for this year. */
  video: number;
  /** B — Billboard Hot 100 distinct tracks for this year. */
  chart: number;
  /** C — Videos with a graph track link (subset of A). */
  linked: number;
  /** Videos in A without chart link. */
  videoOnly: number;
  /** Regression fixture: chart-linked rows that must not drop (1967 = 21). */
  regressionMatched: number;
};

export type ReviewUniversePayload = {
  ok: true;
  year: number;
  reviewMode: "video_universe";
  universes: ReviewUniverseUniverses;
  /** @deprecated Use universes.video */
  videoUniverseCount: number;
  /** @deprecated Use universes.linked */
  chartLinkedCount: number;
  /** @deprecated Use universes.videoOnly */
  videoOnlyCount: number;
  activeYears: number[];
  /** normArtist → bridge badges for card headers */
  bridges: Record<string, ActiveYearBridge>;
  workspace: YearWorkspaceData;
  playCountRows: number;
  needsReviewRows: number;
};

function regressionMatchedCount(year: number, rows: YearWorkspaceRow[]): number {
  if (year !== 1967) {
    return rows.filter((r) => r.graphTrackId != null).length;
  }
  try {
    const raw = readFileSync(
      join(process.cwd(), "reports/review-universe/1967-regression-fixtures.json"),
      "utf8",
    );
    const fixtures = JSON.parse(raw) as {
      matched: Array<{ workspaceKey: string; graphTrackId?: number | null }>;
    };
    let ok = 0;
    for (const f of fixtures.matched) {
      const row = rows.find(
        (r) =>
          r.workspaceKey === f.workspaceKey ||
          (f.graphTrackId != null && r.graphTrackId === f.graphTrackId),
      );
      if (row?.graphTrackId != null && row.vdjMatch === "matched") ok += 1;
    }
    return ok;
  } catch {
    return rows.filter((r) => r.graphTrackId != null && r.vdjMatch === "matched").length;
  }
}

export async function loadReviewUniverse(year: number): Promise<ReviewUniversePayload> {
  const keywordState = await loadYearWorkspaceState(year);
  const [bundle, chartCount] = await Promise.all([
    loadVideoUniverse(year, keywordState),
    loadChartUniverseCount(year),
  ]);
  const { playCountRows, needsReviewRows } = computeReviewApiMetrics(
    bundle.reviewRows,
    keywordState,
  );

  const bridgeIndex = await loadActiveYearBridgeIndex({
    focusYear: year,
    artists: bundle.reviewRows.map((r) => r.artist),
    activeYears: [...REVIEW_PILOT_ACTIVE_YEARS],
  });
  const bridges: Record<string, ActiveYearBridge> = {};
  for (const [norm, bridge] of bridgeIndex) {
    bridges[norm] = bridge;
  }

  const universes: ReviewUniverseUniverses = {
    video: bundle.videoUniverseCount,
    chart: chartCount,
    linked: bundle.chartLinkedCount,
    videoOnly: bundle.videoOnlyCount,
    regressionMatched: regressionMatchedCount(year, bundle.reviewRows),
  };

  const workspace: YearWorkspaceData = {
    year,
    pilotMode: reviewUniverseEnabledForYear(year),
    pilotTopN: null,
    stats: {
      billboardTotal: 0,
      vdjTotal: bundle.videoUniverseCount,
      inBoth: bundle.chartLinkedCount,
      chartOnly: 0,
      vdjOnly: bundle.videoOnlyCount,
    },
    completion: {
      billboardTotal: 0,
      matched: bundle.chartLinkedCount,
      inBoth: bundle.chartLinkedCount,
      missing: bundle.videoOnlyCount,
      chartOnlyPending: 0,
      tagged: 0,
      reviewed: 0,
      reviewQueue: 0,
    },
    inBoth: [],
    chartOnly: [],
    vdjOnly: [],
    review: [],
    reviewRows: bundle.reviewRows,
    reviewMetrics: bundle.reviewMetrics,
  };

  return {
    ok: true,
    year,
    reviewMode: "video_universe",
    universes,
    videoUniverseCount: universes.video,
    chartLinkedCount: universes.linked,
    videoOnlyCount: universes.videoOnly,
    activeYears: [...REVIEW_PILOT_ACTIVE_YEARS],
    bridges,
    workspace,
    playCountRows,
    needsReviewRows,
  };
}
