import { acquisitionsFromState } from "@/lib/ops/acquisitions-from-state";
import { ensureUniqueRowIds } from "@/lib/ops/ensure-unique-ids";
import { inspectPing } from "@/lib/inspect/pg";
import { loadRecentActivityQueue } from "@/lib/ops/load-recent-activity";
import { loadWeeklyRefreshStatus } from "@/lib/ops/load-weekly-refresh";
import { OPS_FOCUS_YEAR } from "@/lib/ops/ops-focus-year";
import { loadOpsState } from "@/lib/ops/ops-state-store";
import type { OpsActivityRow, OpsConsoleData } from "@/lib/ops/types";

export { OPS_FOCUS_YEAR };

export async function loadOpsConsoleData(): Promise<OpsConsoleData> {
  const ping = await inspectPing();
  const state = await loadOpsState();

  if (!ping.ok) {
    return {
      year: OPS_FOCUS_YEAR,
      yearMatch: [],
      acquisition: acquisitionsFromState(state),
      weeklyRefresh: {
        lastVdjSnapshot: null,
        newVideosDetected: 0,
        metadataChanges: 0,
        missingR2Uploads: 0,
        unmatchedMedia: 0,
        lastRefreshResult: "stub",
        lastRefreshNote: "Postgres offline",
      },
      recentActivity: state.activity.slice(0, 25),
      status: {
        pgOk: false,
        pgError: ping.error,
        sources: [],
        partial: ["all sections"],
      },
    };
  }

  const [weeklyRefresh, pgActivity] = await Promise.all([
    loadWeeklyRefreshStatus(),
    loadRecentActivityQueue(),
  ]);

  const acquisition = acquisitionsFromState(state);
  const yearMatch: import("@/lib/ops/reconciliation-model").YearMatchRow[] = [];

  const recentActivity = ensureUniqueRowIds([
    ...state.activity,
    ...pgActivity,
  ]).slice(0, 25);

  return {
    year: OPS_FOCUS_YEAR,
    yearMatch,
    acquisition,
    weeklyRefresh,
    recentActivity,
    status: {
      pgOk: true,
      sources: [
        "Postgres: chart_appearances (Billboard Hot 100)",
        "Postgres: canonical_track_display + media_track_links",
        "Postgres: media_assets (VDJ snapshot / R2 keys)",
        "RETROVERSE_DATA/ops/reconciliation-state.json",
      ],
      partial: ["metadata change count stub", "year match loads via /api/ops/year-match"],
    },
  };
}

/** @deprecated Use loadOpsConsoleData */
export async function loadOpsQueuesData() {
  const data = await loadOpsConsoleData();
  return {
    missingVideos: [],
    missingArtwork: [],
    metadataIssues: [],
    recentActivity: data.recentActivity,
    status: data.status,
  };
}
