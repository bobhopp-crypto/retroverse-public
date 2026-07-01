import "server-only";

import { cache } from "react";

import { inspectPing } from "@/lib/inspect/pg";
import { loadCommandCenterStatus } from "@/lib/ops/load-command-center-status";
import { getMissionControlDashboardCached } from "@/lib/ops/studio/production/load-mission-control-dashboard";

import { buildCommandCenterDashboard } from "./build-modules";
import { readFinanceAttentionSummary } from "./read-finance-attention";
import { readPackageIndexSummary } from "./read-package-index-summary";
import type { CommandCenterDashboard } from "./types";

export const loadCommandCenterDashboard = cache(async (): Promise<CommandCenterDashboard> => {
  const [mission, status, dbPing, packages, finance] = await Promise.all([
    getMissionControlDashboardCached(),
    loadCommandCenterStatus(),
    inspectPing(),
    readPackageIndexSummary(),
    readFinanceAttentionSummary(),
  ]);

  return buildCommandCenterDashboard({
    mission,
    status,
    dbOk: dbPing.ok,
    dbPingAt: dbPing.ok ? new Date().toISOString() : null,
    finance,
    packages,
  });
});
