import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { loadBackfillStatus } from "@/lib/covers/backfill/metrics";
import { listJobs } from "@/lib/ops/content-creator/jobs/store";
import { loadWeeklyRefreshStatus } from "@/lib/ops/load-weekly-refresh";
import { loadOpsState } from "@/lib/ops/ops-state-store";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

export type OpsHomeEnrichmentJob = {
  id: string;
  label: string;
  status: "running" | "queued" | "idle";
  href: string;
};

export type OpsHomeAttentionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: "warn" | "bad" | "info";
};

export type OpsHomeDiscovery = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

export type OpsHomeTool = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type OpsHomeData = {
  generatedAt: string;
  today: {
    sundayNights: {
      status: string;
      detail: string;
      href: string;
    };
    live: {
      status: string;
      detail: string;
      href: string;
    };
    enrichmentJobs: OpsHomeEnrichmentJob[];
  };
  attention: OpsHomeAttentionItem[];
  automation: {
    coverBackfill: {
      running: boolean;
      label: string;
      coversToday: number;
      href: string;
    };
  };
  discoveries: OpsHomeDiscovery[];
  tools: OpsHomeTool[];
};

type AuditTopRow = {
  rvtr: string;
  title: string;
  artist: string;
  completenessPct: number;
  tvLinkage?: boolean;
  albumScore?: number;
};

async function loadAuditTop100(): Promise<AuditTopRow[]> {
  try {
    const raw = await readFile(
      join(process.cwd(), "reports/1970s-performance-universe-audit.json"),
      "utf8",
    );
    const data = JSON.parse(raw) as { top100: AuditTopRow[] };
    return data.top100 ?? [];
  } catch {
    return [];
  }
}

export async function loadOpsHomeData(): Promise<OpsHomeData> {
  const generatedAt = new Date().toISOString();

  const [sunday, backfill, weekly, opsState, ccJobs, auditTop] = await Promise.all([
    loadSundayNightsState(),
    loadBackfillStatus().catch(() => null),
    loadWeeklyRefreshStatus().catch(() => null),
    loadOpsState(),
    listJobs().catch(() => []),
    loadAuditTop100(),
  ]);

  const liveOn = Boolean(sunday.live?.artist && sunday.live?.title);
  const sundayStatus = liveOn ? "Live" : sunday.currentTrackId ? "Armed" : "Idle";
  const sundayDetail = liveOn
    ? `${sunday.live!.artist} — ${sunday.live!.title}`
    : sunday.currentTrackId
      ? `Track armed · ${sunday.currentTrackId}`
      : "No track selected";

  const bridgeDetail = sunday.live?.resolution
    ? `Bridge · ${sunday.live.resolution}`
    : liveOn
      ? "Now playing on site"
      : "Standby";

  const reviewCount = auditTop.filter((r) => r.completenessPct < 75).length;
  const failedCc = ccJobs.filter((j) => j.status === "failed").length;
  const failedBackfill = backfill?.metrics.uniqueFailures ?? 0;
  const failedJobs = failedCc + (failedBackfill > 0 ? Math.min(failedBackfill, 99) : 0);

  const missingR2 = weekly?.missingR2Uploads ?? 0;
  const unmatched = weekly?.unmatchedMedia ?? 0;
  const missingAssets = missingR2 + unmatched;

  const enrichmentJobs: OpsHomeEnrichmentJob[] = [];

  if (backfill?.state.running) {
    enrichmentJobs.push({
      id: "cover-backfill",
      label: "Cover backfill",
      status: "running",
      href: "/ops/covers/backfill",
    });
  }

  const runningCc = ccJobs.filter((j) => j.status === "running" || j.status === "queued");
  for (const job of runningCc.slice(0, 2)) {
    enrichmentJobs.push({
      id: job.id,
      label: job.title,
      status: job.status === "running" ? "running" : "queued",
      href: "/ops/content-creator/create",
    });
  }

  const topMission = auditTop[0];
  if (topMission) {
    enrichmentJobs.push({
      id: "atlas-mission",
      label: `Atlas · ${topMission.title}`,
      status: "queued",
      href: `/ops/atlas/mission/${topMission.rvtr}`,
    });
  }

  if (enrichmentJobs.length === 0) {
    enrichmentJobs.push({
      id: "atlas-idle",
      label: "Atlas missions ready",
      status: "idle",
      href: "/ops/atlas/1970s",
    });
  }

  const tvCandidates = auditTop.filter((r) => !r.tvLinkage).length;
  const albumCandidates = auditTop.filter((r) => (r.albumScore ?? 0) < 0.75).length;

  const recentAlbumActivity = opsState.activity.find((a) =>
    /album|membership|healing|link/i.test(`${a.action} ${a.entity}`),
  );

  const discoveries: OpsHomeDiscovery[] = [
    {
      id: "tv",
      label: "New TV appearances",
      detail:
        tvCandidates > 0
          ? `${tvCandidates} priority tracks awaiting TV review`
          : "Mission TV slots ready for review",
      href: "/ops/atlas/1970s",
    },
    {
      id: "album",
      label: "New album matches",
      detail: recentAlbumActivity
        ? `${recentAlbumActivity.action} · ${recentAlbumActivity.entity}`
        : albumCandidates > 0
          ? `${albumCandidates} tracks need album evidence`
          : "Co-album membership enabled",
      href: "/ops/healing",
    },
  ];

  return {
    generatedAt,
    today: {
      sundayNights: {
        status: sundayStatus,
        detail: sundayDetail,
        href: "/ops/sunday-nights",
      },
      live: {
        status: liveOn ? "On air" : "Off air",
        detail: bridgeDetail,
        href: "/ops/live",
      },
      enrichmentJobs: enrichmentJobs.slice(0, 4),
    },
    attention: [
      {
        id: "review",
        label: "Review items",
        count: reviewCount,
        href: "/ops/atlas/1970s",
        tone: "warn",
      },
      {
        id: "failed",
        label: "Failed jobs",
        count: failedJobs,
        href: "/ops/covers/backfill",
        tone: failedJobs > 0 ? "bad" : "info",
      },
      {
        id: "missing",
        label: "Missing assets",
        count: missingAssets,
        href: "/ops/media-sync",
        tone: missingAssets > 0 ? "warn" : "info",
      },
    ],
    automation: {
      coverBackfill: {
        running: Boolean(backfill?.state.running),
        label: backfill?.state.running
          ? "Cover backfill running"
          : backfill?.state.paused
            ? "Cover backfill paused"
            : "Cover backfill idle",
        coversToday: backfill?.metrics.coversAcquiredToday ?? 0,
        href: "/ops/covers/backfill",
      },
    },
    discoveries,
    tools: [
      {
        id: "finance",
        label: "Finance",
        description: "Income, AI spend, Retroverse ops, subscriptions",
        href: "/ops/finance",
      },
      {
        id: "finance-import",
        label: "Finance Import",
        description: "Drop statements · auto-categorize · review queue",
        href: "/ops/finance/import",
      },
      {
        id: "workshop",
        label: "Workshop",
        description: "Creative Lab — styles, passes, and print outputs",
        href: "/ops/creative-lab",
      },
    ],
  };
}
