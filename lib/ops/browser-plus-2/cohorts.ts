import "server-only";

import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

import {
  classifyReadinessBlocker,
  emptyReadinessBlockers,
  isPatronExperienceReady,
  readinessPct,
  type Bp2ReadinessInput,
} from "./readiness";
import { isActiveVideoRow } from "./status";
import type { Bp2CohortContext, Bp2PackageHint, Bp2ReadinessBlockers, Bp2ReadinessPanel, Bp2Row } from "./types";

export async function loadBp2CohortContext(
  rows: Array<Pick<BrowserPlusRow, "rvtr" | "playCount" | "filePath" | "isVideo">>,
): Promise<Bp2CohortContext> {
  const { loadSundayEventSongsFromSnapshots } = await import("@/lib/sunday-nights/load-snapshots");
  const sundaySongs = await loadSundayEventSongsFromSnapshots("all");
  const sundayRvtrs = new Set(
    sundaySongs.map((s) => s.rvtr?.toUpperCase()).filter((v): v is string => Boolean(v)),
  );

  const withRvtr = rows.filter((row) => row.rvtr && isActiveVideoRow(row as BrowserPlusRow));
  const sorted = [...withRvtr].sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));
  const top100Rvtrs = new Set(sorted.slice(0, 100).map((row) => row.rvtr!.toUpperCase()));
  const top500Rvtrs = new Set(sorted.slice(0, 500).map((row) => row.rvtr!.toUpperCase()));

  return {
    sundayRvtrs,
    top100Rvtrs,
    top500Rvtrs,
    sundaySnapshotSongCount: sundaySongs.length,
  };
}

function countBlockersForCohort(
  rvtrSet: Set<string>,
  rowByRvtr: Map<string, Bp2Row>,
  coverByRvtr: Map<string, string | null>,
  hints: Map<string, Bp2PackageHint>,
): Bp2ReadinessBlockers {
  const blockers = emptyReadinessBlockers();

  for (const rvtr of rvtrSet) {
    const key = rvtr.toUpperCase();
    const row = rowByRvtr.get(key) ?? null;
    const hint = hints.get(key) ?? hints.get(rvtr) ?? null;

    if (!row) {
      blockers.missingResearch += 1;
      continue;
    }

    const input: Bp2ReadinessInput & { inLibrary: boolean; researchStatus: string | null } = {
      row,
      hint,
      canonicalCoverUrl: coverByRvtr.get(key) ?? null,
      storyCount: row.storyCount,
      inLibrary: true,
      researchStatus: hint?.status ?? row.researchPackageStatus,
    };

    if (isPatronExperienceReady(input)) continue;

    const blocker = classifyReadinessBlocker(input);
    if (blocker === "ready" || blocker === "notInLibrary") continue;
    blockers[blocker] += 1;
  }

  return blockers;
}

export function buildReadinessPanels(
  rows: Bp2Row[],
  cohorts: Bp2CohortContext,
  readinessByRvtr: Map<string, boolean>,
  coverByRvtr: Map<string, string | null>,
  hints: Map<string, Bp2PackageHint>,
): Bp2ReadinessPanel[] {
  const rowByRvtr = new Map(
    rows.filter((r) => r.rvtr).map((r) => [r.rvtr!.toUpperCase(), r] as const),
  );

  function panel(
    id: Bp2ReadinessPanel["id"],
    label: string,
    rvtrSet: Set<string>,
    actionLabel: string,
  ): Bp2ReadinessPanel {
    const members = [...rvtrSet];
    const ready = members.filter((rvtr) => readinessByRvtr.get(rvtr.toUpperCase())).length;
    return {
      id,
      label,
      ready,
      total: members.length,
      pct: readinessPct(ready, members.length),
      missingFilter: `${id}-missing` as Bp2ReadinessPanel["missingFilter"],
      blockers: countBlockersForCohort(rvtrSet, rowByRvtr, coverByRvtr, hints),
      actionLabel,
    };
  }

  return [
    panel("sunday-nights", "Sunday Nights", cohorts.sundayRvtrs, "Fix Remaining"),
    panel("top-100", "Top 100", cohorts.top100Rvtrs, "Show Missing"),
    panel("top-500", "Top 500", cohorts.top500Rvtrs, "Show Missing"),
  ];
}

export function buildReadinessByRvtr(
  rows: Bp2Row[],
  coverByRvtr: Map<string, string | null>,
  hints: Map<string, Bp2PackageHint>,
): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const row of rows) {
    if (!row.rvtr) continue;
    const hint = hints.get(row.rvtr) ?? null;
    const input: Bp2ReadinessInput = {
      row,
      hint,
      canonicalCoverUrl: coverByRvtr.get(row.rvtr.toUpperCase()) ?? null,
      storyCount: row.storyCount,
    };
    out.set(row.rvtr.toUpperCase(), isPatronExperienceReady(input));
  }
  return out;
}
