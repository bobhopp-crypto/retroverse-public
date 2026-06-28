import "server-only";

import { cache } from "react";

import { completedTodayCount, loadCollectorProgress } from "@/lib/ops/studio/collector/store";
import { safeMetricCount } from "@/lib/ops/studio/living/mission-control-format";
import {
  getAllDepartmentLiveStatusesCached,
  getDepartmentQueueIndexCached,
  getMissionControlPayloadCached,
  loadStudioActivityFeed,
} from "@/lib/ops/studio/department-status";
import type {
  DepartmentLiveSong,
  DepartmentLiveStatus,
  DepartmentRunStatus,
  StudioDepartmentId,
} from "@/lib/ops/studio/department-status/types";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { identifyStrings } from "@/lib/ops/studio/model-identity";
import { getPublisherStoreCached } from "@/lib/ops/studio/studio-cached-loaders";
import { isPublisherApproved } from "@/lib/ops/studio/publisher/store";

import {
  DEPARTMENT_PERSONALITIES,
  DIRECTOR_EXHIBIT_STEPS,
  formatActivityTime,
  pickRotatingActivity,
} from "./personalities";
import type {
  DirectorProductionSnapshot,
  DirectorProductionStep,
  LivingActivityEvent,
  LivingDepartmentId,
  LivingDepartmentSnapshot,
  LivingPipelineNode,
  LivingPipelineStage,
  LivingProductionCard,
  LivingStudioSnapshot,
} from "./types";

function cardHref(stage: LivingPipelineStage, rvtr: string): string {
  switch (stage) {
    case "collector":
      return `/ops/studio/collector/${rvtr}`;
    case "editor":
      return `/ops/studio/editor/${rvtr}`;
    case "director":
      return `/ops/studio/director?rvtr=${rvtr}`;
    case "publisher":
      return `/ops/studio/publisher/${rvtr}`;
    case "published":
      return `/experience/${rvtr}`;
  }
}

function toProductionCard(
  song: DepartmentLiveSong,
  stage: LivingPipelineStage,
  subtitle?: string,
): LivingProductionCard {
  return {
    rvtr: song.rvtr,
    artist: song.artist,
    title: song.title,
    coverUrl: song.coverUrl ?? null,
    stage,
    href: cardHref(stage, song.rvtr),
    subtitle: subtitle ?? song.subtitle,
  };
}

function moodFromStatus(status: DepartmentRunStatus, queueRemaining: number): "active" | "working" | "idle" {
  if (status === "running") return "working";
  if (status === "waiting" || queueRemaining > 0) return "active";
  return "idle";
}

function departmentSnapshotFromLive(
  id: StudioDepartmentId,
  live: DepartmentLiveStatus,
  activityFeed: LivingActivityEvent[],
  seed: number,
): LivingDepartmentSnapshot {
  const personality = DEPARTMENT_PERSONALITIES[id];
  const mood = moodFromStatus(live.status, safeMetricCount(live.queueRemaining));
  const pool = mood === "working" ? personality.workingActivities : personality.idleActivities;
  const deptFeed = activityFeed.filter((e) => e.department === id);
  const currentProduction = live.currentSong ? toProductionCard(live.currentSong, id) : null;
  const recentProductions = live.lastCompletedSong
    ? [toProductionCard(live.lastCompletedSong, id)]
    : [];

  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    personality: personality.atmosphere,
    atmosphere: personality.atmosphere,
    mood,
    currentActivity: pickRotatingActivity(pool, seed + id.length),
    queueCount: safeMetricCount(live.queueRemaining),
    completedToday: safeMetricCount(live.completedToday),
    emptyMessage: personality.emptyMessage,
    href: `/ops/studio/${id}`,
    currentProduction,
    recentProductions,
    upcomingQueue: [],
    activityFeed: deptFeed.length > 0 ? deptFeed : activityFeed.slice(0, 6),
  };
}

function mapActivityEvents(
  events: Awaited<ReturnType<typeof loadStudioActivityFeed>>,
): LivingActivityEvent[] {
  return events.map((event) => ({
    id: event.id,
    at: event.at,
    timeLabel: formatActivityTime(event.at),
    message: event.message,
    department: event.department === "system" ? "system" : event.department,
    rvtr: event.rvtr,
  }));
}

async function loadRecentPublications(): Promise<LivingProductionCard[]> {
  const store = await getPublisherStoreCached();
  return store.records
    .filter((r) => isPublisherApproved(r))
    .sort((a, b) => {
      const ta = a.publishedAt ?? a.approvedAt ?? "";
      const tb = b.publishedAt ?? b.approvedAt ?? "";
      return tb.localeCompare(ta);
    })
    .slice(0, 8)
    .map((r) =>
      toProductionCard(
        {
          rvtr: r.rvtr,
          artist: r.artist,
          title: r.title,
          coverUrl: r.coverUrl,
          subtitle: r.approvedClass?.replace("_", " "),
        },
        "published",
      ),
    );
}

export async function loadLivingStudioSnapshot(): Promise<LivingStudioSnapshot> {
  const [payload, collectorProgress, recentPublications] = await Promise.all([
    getMissionControlPayloadCached(),
    loadCollectorProgress().catch(() => null),
    loadRecentPublications(),
  ]);

  const seed = Math.floor(Date.now() / 15000);
  const activityFeed = mapActivityEvents(payload.activity);

  const departments: LivingDepartmentSnapshot[] = (
    ["collector", "editor", "director", "publisher"] as const
  ).map((id) =>
    departmentSnapshotFromLive(id, payload.departments[id], activityFeed, seed),
  );

  const pipeline: LivingPipelineNode[] = [
    {
      stage: "collector",
      label: "Collector",
      processingLabel: "Research…",
      count: safeMetricCount(payload.departments.collector.queueRemaining),
      isActive: payload.departments.collector.status === "running",
      href: "/ops/studio/collector",
    },
    {
      stage: "editor",
      label: "Editor",
      processingLabel: "Writing…",
      count: safeMetricCount(payload.departments.editor.queueRemaining),
      isActive: payload.departments.editor.status === "running",
      href: "/ops/studio/editor",
    },
    {
      stage: "director",
      label: "Director",
      processingLabel: "Designing…",
      count: safeMetricCount(payload.departments.director.queueRemaining),
      isActive: payload.departments.director.status === "running",
      href: "/ops/studio/director",
    },
    {
      stage: "publisher",
      label: "Publisher",
      processingLabel: "Reviewing…",
      count: safeMetricCount(payload.departments.publisher.queueRemaining),
      isActive: payload.departments.publisher.status === "running",
      href: "/ops/studio/publisher",
    },
    {
      stage: "published",
      label: "Published",
      processingLabel: "Published",
      count: safeMetricCount(payload.queueIndex?.publishedTotal),
      isActive: false,
      href: "/ops/studio/publisher/museum",
    },
  ];

  const activeSong =
    departments.find((d) => d.mood === "working")?.currentProduction ??
    departments.find((d) => d.currentProduction)?.currentProduction ??
    null;

  const completedToday = collectorProgress ? completedTodayCount(collectorProgress.recentlyCompleted) : 0;
  const todayAccomplishmentTexts: string[] = [];
  if (completedToday > 0) {
    todayAccomplishmentTexts.push(`${completedToday} research packages completed`);
  }
  if (payload.departments.director.queueRemaining > 0) {
    todayAccomplishmentTexts.push(
      `${payload.departments.director.queueRemaining} stories ready for Director`,
    );
  }
  if (payload.queueIndex.publishedTotal > 0) {
    todayAccomplishmentTexts.push(
      `${payload.queueIndex.publishedTotal} experiences live for patrons`,
    );
  }

  const todayAccomplishments = identifyStrings("living-accomplishment", todayAccomplishmentTexts);

  return {
    generatedAt: payload.generatedAt,
    activeSong,
    pipeline,
    departments,
    recentPublications,
    todayAccomplishments,
    recentCompletions: recentPublications.slice(0, 6),
    pipelineHealth: undefined,
  };
}

export async function loadDirectorProductionSnapshot(): Promise<DirectorProductionSnapshot> {
  const [live, activity] = await Promise.all([
    getAllDepartmentLiveStatusesCached().then((s) => s.director),
    loadStudioActivityFeed(8),
  ]);

  const current = live.currentSong ? toProductionCard(live.currentSong, "director") : null;

  let steps: DirectorProductionStep[] = DIRECTOR_EXHIBIT_STEPS.map((s) => ({
    id: s.id,
    label: s.label,
    status: "pending" as const,
  }));

  if (current) {
    const director = await loadDirectorPackage(current.rvtr);
    const sceneCount = director?.experiencePlan.scenes.length ?? 0;
    const doneCount = Math.min(DIRECTOR_EXHIBIT_STEPS.length - 1, Math.max(0, sceneCount - 1));
    steps = DIRECTOR_EXHIBIT_STEPS.map((s, index) => {
      if (index < doneCount) return { id: s.id, label: s.label, status: "done" as const };
      if (index === doneCount) return { id: s.id, label: s.label, status: "active" as const };
      return { id: s.id, label: s.label, status: "pending" as const };
    });
    if (director?.renderSpec) {
      steps = steps.map((s, i) =>
        i < DIRECTOR_EXHIBIT_STEPS.length
          ? { ...s, status: i < DIRECTOR_EXHIBIT_STEPS.length - 1 ? "done" : "active" }
          : s,
      );
    }
  }

  const doneSteps = steps.filter((s) => s.status === "done").length;
  const progressPct = Math.round((doneSteps / steps.length) * 100);

  const activityFeed = mapActivityEvents(activity.filter((e) => e.department === "director"));

  return {
    generatedAt: new Date().toISOString(),
    mood: live.status === "running" || live.queueRemaining > 0 ? "active" : "idle",
    current,
    steps,
    progressPct,
    recentProductions: live.lastCompletedSong
      ? [toProductionCard(live.lastCompletedSong, "director")]
      : [],
    activityFeed,
    emptyMessage: DEPARTMENT_PERSONALITIES.director.emptyMessage,
  };
}

export async function loadDepartmentLivingSnapshot(
  id: LivingDepartmentId,
): Promise<LivingDepartmentSnapshot> {
  const snapshot = await loadLivingStudioSnapshot();
  return snapshot.departments.find((d) => d.id === id)!;
}

export async function loadDepartmentLivingSnapshotLite(
  id: LivingDepartmentId,
): Promise<LivingDepartmentSnapshot> {
  const [statuses, activity] = await Promise.all([
    getAllDepartmentLiveStatusesCached(),
    loadStudioActivityFeed(12),
  ]);
  const seed = Math.floor(Date.now() / 15000);
  const activityFeed = mapActivityEvents(activity);
  return departmentSnapshotFromLive(id, statuses[id], activityFeed, seed);
}

const loadRecentPublicationsCached = cache(loadRecentPublications);

export { loadRecentPublicationsCached };
