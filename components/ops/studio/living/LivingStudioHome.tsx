"use client";

import { useEffect, useState } from "react";

import { chartJourneyPath } from "@/lib/retroverse/published-launch-paths";
import type { LivingStudioSnapshot } from "@/lib/ops/studio/living/types";
import type { StudioMissionControlPayload } from "@/lib/ops/studio/department-status/types";
import { safeMetricCount } from "@/lib/ops/studio/living/mission-control-format";

import { LivingStudioHomeView } from "./LivingStudioHomeView";

type Props = {
  initialSnapshot: LivingStudioSnapshot;
};

function cardHref(stage: string, rvtr: string): string {
  switch (stage) {
    case "collector":
      return `/ops/studio/collector/${rvtr}`;
    case "editor":
      return `/ops/studio/editor/${rvtr}`;
    case "director":
      return `/ops/studio/director?rvtr=${rvtr}`;
    case "publisher":
      return `/ops/studio/publisher/${rvtr}`;
    default:
      return chartJourneyPath(rvtr);
  }
}

function payloadToSnapshot(
  payload: StudioMissionControlPayload,
  previous: LivingStudioSnapshot,
): LivingStudioSnapshot {
  const activityFeed = payload.activity.map((event) => ({
    id: event.id,
    at: event.at,
    timeLabel: new Date(event.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    message: event.message,
    department: event.department === "system" ? ("system" as const) : event.department,
    rvtr: event.rvtr,
  }));

  const departments = (["collector", "editor", "director", "publisher"] as const).map((id) => {
    const live = payload.departments[id];
    const prev = previous.departments.find((d) => d.id === id);
    const mood =
      live.status === "running"
        ? ("working" as const)
        : live.status === "waiting" || safeMetricCount(live.queueRemaining) > 0
          ? ("active" as const)
          : ("idle" as const);

    const currentProduction = live.currentSong
      ? {
          rvtr: live.currentSong.rvtr,
          artist: live.currentSong.artist,
          title: live.currentSong.title,
          coverUrl: live.currentSong.coverUrl ?? null,
          stage: id,
          href: cardHref(id, live.currentSong.rvtr),
          subtitle: live.currentSong.subtitle,
        }
      : null;

    return {
      id,
      name: prev?.name ?? id.charAt(0).toUpperCase() + id.slice(1),
      personality: prev?.personality ?? "",
      atmosphere: prev?.atmosphere ?? "",
      mood,
      currentActivity: prev?.currentActivity ?? "",
      queueCount: safeMetricCount(live.queueRemaining),
      completedToday: safeMetricCount(live.completedToday),
      emptyMessage: prev?.emptyMessage ?? "",
      href: `/ops/studio/${id}`,
      currentProduction,
      recentProductions: prev?.recentProductions ?? [],
      upcomingQueue: prev?.upcomingQueue ?? [],
      activityFeed: activityFeed.filter((e) => e.department === id),
    };
  });

  const pipeline = [
    {
      stage: "collector" as const,
      label: "Collector",
      processingLabel: "Research…",
      count: safeMetricCount(payload.departments.collector.queueRemaining),
      isActive: payload.departments.collector.status === "running",
      href: "/ops/studio/collector",
    },
    {
      stage: "editor" as const,
      label: "Editor",
      processingLabel: "Writing…",
      count: safeMetricCount(payload.departments.editor.queueRemaining),
      isActive: payload.departments.editor.status === "running",
      href: "/ops/studio/editor",
    },
    {
      stage: "director" as const,
      label: "Director",
      processingLabel: "Designing…",
      count: safeMetricCount(payload.departments.director.queueRemaining),
      isActive: payload.departments.director.status === "running",
      href: "/ops/studio/director",
    },
    {
      stage: "publisher" as const,
      label: "Publisher",
      processingLabel: "Reviewing…",
      count: safeMetricCount(payload.departments.publisher.queueRemaining),
      isActive: payload.departments.publisher.status === "running",
      href: "/ops/studio/publisher",
    },
    {
      stage: "published" as const,
      label: "Published",
      processingLabel: "Published",
      count: safeMetricCount(payload.queueIndex?.publishedTotal),
      isActive: false,
      href: "/retroverse/experiences",
    },
  ];

  const activeSong =
    departments.find((d) => d.mood === "working")?.currentProduction ??
    departments.find((d) => d.currentProduction)?.currentProduction ??
    previous.activeSong;

  return {
    generatedAt: payload.generatedAt,
    activeSong,
    pipeline,
    departments,
    recentPublications: previous.recentPublications,
    todayAccomplishments: previous.todayAccomplishments,
    recentCompletions: previous.recentCompletions,
    dashboard: previous.dashboard,
  };
}

export function LivingStudioHome({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/ops/studio/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { ok: boolean } & StudioMissionControlPayload;
        if (!cancelled && data.ok) {
          setSnapshot((prev) => payloadToSnapshot(data, prev));
        }
      } catch {
        /* ignore */
      }
    }

    const id = setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return <LivingStudioHomeView snapshot={snapshot} />;
}
