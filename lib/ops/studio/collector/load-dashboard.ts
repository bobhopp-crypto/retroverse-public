import { COLLECTOR_PILOT_SONGS } from "./pilot-songs";
import {
  buildDashboardCardView,
  buildInvestigationView,
  countTodayDiscoveries,
  type CollectorDashboardCardView,
  type CollectorInvestigationView,
} from "./presentation";
import {
  completedTodayCount,
  formatAvgRuntime,
  loadCollectorPackage,
  loadCollectorProgress,
  statusLabel,
} from "./store";
import type { CollectorDashboardStats, CollectorPackage } from "./types";

export type CollectorPageContext = {
  stats: CollectorDashboardStats;
  investigation: CollectorInvestigationView;
  dashboardCard: CollectorDashboardCardView;
  package: CollectorPackage | null;
};

export async function loadCollectorDashboardStats(): Promise<CollectorDashboardStats> {
  const progress = await loadCollectorProgress();
  const avgMs = progress.avgRuntimeMs;
  const completedToday = completedTodayCount(progress.recentlyCompleted);

  return {
    status: progress.status,
    statusLabel: statusLabel(progress.status),
    currentSong: progress.currentSong
      ? `${progress.currentSong.artist} — ${progress.currentSong.title}`
      : "—",
    currentStage: progress.currentStageLabel ?? "—",
    queue: progress.queue,
    completedToday,
    averageTime: formatAvgRuntime(avgMs),
    researchQuality:
      progress.researchQuality != null ? `${progress.researchQuality}%` : "—",
    recentActivity: progress.recentActivity.slice(0, 20),
    recentlyCompleted: progress.recentlyCompleted.slice(0, 8),
    progress,
  };
}

export async function loadCollectorPageContext(): Promise<CollectorPageContext> {
  const stats = await loadCollectorDashboardStats();
  const latestRvtr = stats.recentlyCompleted[0]?.rvtr ?? stats.progress.currentSong?.rvtr;
  const pkg = latestRvtr ? await loadCollectorPackage(latestRvtr) : null;
  const todayDiscoveries = await countTodayDiscoveries(
    stats.recentlyCompleted,
    loadCollectorPackage,
  );

  return {
    stats,
    investigation: buildInvestigationView(stats, pkg),
    dashboardCard: buildDashboardCardView(stats, todayDiscoveries),
    package: pkg,
  };
}

export function previewCollectorPackage(pkg: CollectorPackage | null) {
  if (!pkg) return null;
  return {
    rvtr: pkg.rvtr,
    artist: pkg.artist,
    title: pkg.title,
    researchQuality: pkg.researchQuality,
    researchSummary: pkg.summary.researchSummary,
    sourceSummary: pkg.summary.sourceSummary,
    missingAreas: pkg.missingAreas,
    candidateFactCount: pkg.candidateFacts.length,
    sourceCount: pkg.sourceLog.length,
    stages: Object.entries(pkg.stages).map(([id, stage]) => ({
      id,
      summary: stage.summary,
    })),
  };
}

export function collectorPilotRvtrs(): string[] {
  return COLLECTOR_PILOT_SONGS.map((song) => song.rvtr).filter(Boolean) as string[];
}
