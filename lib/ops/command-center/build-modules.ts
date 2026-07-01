import { formatMetricCount } from "@/lib/ops/studio/living/mission-control-format";
import type { MissionControlDashboard } from "@/lib/ops/studio/production/load-mission-control-dashboard";
import type { CommandCenterStatus } from "@/lib/ops/load-command-center-status";

import type {
  CommandCenterDashboard,
  CommandCenterModule,
  FinanceAttentionSummary,
  ModuleStatusTone,
  PackageHighlight,
  PackageIndexSummary,
} from "./types";

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function latestIso(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = 0;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms <= bestMs) continue;
    bestMs = ms;
    best = value;
  }
  return best;
}

function formatSongLine(artist: string, title: string, rvtr?: string | null): string {
  const suffix = rvtr ? ` (${rvtr})` : "";
  return `${artist} — ${title}${suffix}`;
}

function highlightLine(prefix: string, highlight: PackageHighlight | null): string | null {
  if (!highlight) return null;
  return `${prefix}: ${formatSongLine(highlight.artist, highlight.title, highlight.rvtr)}`;
}

function formatEventIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

function pipelineStatus(
  dashboard: MissionControlDashboard,
): { status: ModuleStatusTone; label: string } {
  const { counts } = dashboard;
  if (counts.collectorComplete <= 0) {
    return { status: "gray", label: "Unavailable" };
  }
  if (counts.failed > 0) {
    return { status: "red", label: "Failures detected" };
  }
  if (counts.currentlyProcessing > 0) {
    return { status: "blue", label: "Active" };
  }
  if (counts.backlogRemaining > 0) {
    return { status: "yellow", label: "Backlog draining" };
  }
  if (counts.published >= counts.collectorComplete) {
    return { status: "green", label: "Healthy" };
  }
  return { status: "orange", label: "Action required" };
}

function moduleBase(
  input: Omit<CommandCenterModule, "progress" | "progressLabel" | "healthStrip"> & {
    progress: number;
  },
): CommandCenterModule {
  const progress = clampRatio(input.progress);
  return {
    ...input,
    progress,
    progressLabel: `${Math.round(progress * 100)}%`,
    healthStrip: input.status,
  };
}

function buildStudioPipelineModule(dashboard: MissionControlDashboard): CommandCenterModule {
  const { counts, backlogRun, live } = dashboard;
  const total = Math.max(counts.collectorComplete, 1);
  const { status, label } = pipelineStatus(dashboard);

  let lastEvent = "No recent activity";
  if (live.currentlyProcessing) {
    lastEvent = `Processing: ${formatSongLine(
      live.currentlyProcessing.artist,
      live.currentlyProcessing.title,
      live.currentlyProcessing.rvtr,
    )}`;
  } else if (live.lastPublished) {
    lastEvent = `Last published: ${formatSongLine(
      live.lastPublished.artist,
      live.lastPublished.title,
      live.lastPublished.rvtr,
    )}`;
  } else if (backlogRun.updatedAt) {
    lastEvent = `Backlog updated ${formatEventIso(backlogRun.updatedAt) ?? backlogRun.updatedAt}`;
  }

  const attentionBadges: string[] = [];
  if (counts.failed > 0) attentionBadges.push("Failed packages");
  if (counts.needsEditor > 0 && status !== "blue") attentionBadges.push("Needs editor");
  if (
    counts.backlogRemaining > 0 &&
    counts.currentlyProcessing === 0 &&
    backlogRun.throughputPerHour == null
  ) {
    attentionBadges.push("Queue stalled");
  }

  const actionHref =
    live.processingDepartment != null
      ? `/ops/studio/${live.processingDepartment}`
      : "/ops/studio";

  return moduleBase({
    id: "studio-pipeline",
    title: "Studio Pipeline",
    primaryMetric: `${formatMetricCount(counts.published)} / ${formatMetricCount(counts.collectorComplete)} published`,
    progress: counts.published / total,
    status,
    statusLabel: label,
    lastEvent,
    attentionBadges,
    lastUpdated: latestIso([
      dashboard.generatedAt,
      backlogRun.updatedAt,
      live.lastPublished?.publishedAt ?? null,
    ]),
    secondaryMetrics: [
      { label: "Backlog", value: formatMetricCount(counts.backlogRemaining) },
      { label: "Needs editor", value: formatMetricCount(counts.needsEditor) },
      { label: "Failures", value: formatMetricCount(counts.failed) },
    ],
    action: counts.currentlyProcessing > 0 ? "Continue" : "Open",
    actionHref,
  });
}

function buildProductionLibraryModule(dashboard: MissionControlDashboard): CommandCenterModule {
  const { counts, live } = dashboard;
  const total = Math.max(counts.collectorComplete, 1);
  const ready = counts.published;
  const needsWork = Math.max(0, counts.collectorComplete - counts.published);

  let status: ModuleStatusTone = "green";
  let statusLabel = "Healthy";
  if (counts.collectorComplete <= 0) {
    status = "gray";
    statusLabel = "Unavailable";
  } else if (needsWork > counts.collectorComplete * 0.5) {
    status = "orange";
    statusLabel = "Action required";
  } else if (needsWork > 0) {
    status = "yellow";
    statusLabel = "Needs work";
  }

  let lastEvent = "No recent activity";
  if (live.lastPublished) {
    lastEvent = `Last ready: ${formatSongLine(
      live.lastPublished.artist,
      live.lastPublished.title,
      live.lastPublished.rvtr,
    )}`;
  } else if (dashboard.generatedAt) {
    lastEvent = `Library scan ${formatEventIso(dashboard.generatedAt) ?? dashboard.generatedAt}`;
  }

  const attentionBadges: string[] = [];
  if (needsWork > 0) attentionBadges.push("Needs work");
  if (counts.needsEditor > 0) attentionBadges.push("Needs story");

  return moduleBase({
    id: "production-library",
    title: "Production Library",
    primaryMetric: `${formatMetricCount(ready)} ready · ${formatMetricCount(needsWork)} need work`,
    progress: ready / total,
    status,
    statusLabel,
    lastEvent,
    attentionBadges,
    lastUpdated: latestIso([dashboard.generatedAt, live.lastPublished?.publishedAt ?? null]),
    secondaryMetrics: [
      { label: "Collector complete", value: formatMetricCount(counts.collectorComplete) },
      { label: "Missing story", value: formatMetricCount(counts.needsEditor) },
      { label: "Awaiting publish", value: formatMetricCount(counts.needsPublisher) },
    ],
    action: "Open",
    actionHref: needsWork > 0 ? "/ops/library?filter=needs_work" : "/ops/library",
  });
}

function buildLibraryQueueModule(dashboard: MissionControlDashboard): CommandCenterModule {
  const { counts, backlogRun, live } = dashboard;
  const entered = backlogRun.enteredPipeline;
  const total = Math.max(counts.backlogRemaining + entered, 1);
  const progress = entered / total;

  let status: ModuleStatusTone = "green";
  let statusLabel = "Queue clear";
  if (counts.currentlyProcessing > 0) {
    status = "blue";
    statusLabel = "Processing";
  } else if (counts.failed > 0) {
    status = "red";
    statusLabel = "Blocked";
  } else if (counts.backlogRemaining > 0) {
    status = "yellow";
    statusLabel = "Queued work";
  }

  let lastEvent = "No recent activity";
  if (live.currentlyProcessing) {
    lastEvent = `Running: ${formatSongLine(
      live.currentlyProcessing.artist,
      live.currentlyProcessing.title,
      live.currentlyProcessing.rvtr,
    )}`;
  } else if (backlogRun.updatedAt) {
    lastEvent = `Queue updated · ${formatMetricCount(entered)} entered pipeline`;
  }

  const attentionBadges: string[] = [];
  if (counts.failed > 0) attentionBadges.push("Failed packages");
  if (counts.backlogRemaining > 0 && counts.currentlyProcessing === 0) {
    attentionBadges.push("Queue waiting");
  }

  return moduleBase({
    id: "library-queue",
    title: "Library & Queue",
    primaryMetric: `${formatMetricCount(counts.backlogRemaining)} songs remaining`,
    progress,
    status,
    statusLabel,
    lastEvent,
    attentionBadges,
    lastUpdated: latestIso([backlogRun.updatedAt, dashboard.generatedAt]),
    secondaryMetrics: [
      { label: "Entered pipeline", value: formatMetricCount(entered) },
      {
        label: "Throughput",
        value:
          backlogRun.throughputPerHour != null ? `${backlogRun.throughputPerHour}/hr` : "—",
      },
      { label: "Skipped", value: formatMetricCount(counts.skipped) },
    ],
    action: "Continue",
    actionHref: "/ops/browser-plus-2",
  });
}

function buildLiveModule(status: CommandCenterStatus): CommandCenterModule {
  let tone: ModuleStatusTone = "green";
  let statusLabel = "Standby";

  if (status.liveActive) {
    tone = "blue";
    statusLabel = "Live now";
  } else if (!status.vdjBridgeOk) {
    tone = "yellow";
    statusLabel = "Bridge offline";
  } else if (!status.systemOk) {
    tone = "red";
    statusLabel = "Needs attention";
  }

  const lastEvent = status.liveActive
    ? `On air: ${status.liveLabel}`
    : status.liveRvtr
      ? `Last known: ${status.liveLabel}`
      : "No recent activity";

  const attentionBadges: string[] = [];
  if (!status.vdjBridgeOk) attentionBadges.push("Bridge offline");

  return moduleBase({
    id: "live-performance",
    title: "Live Performance",
    primaryMetric: status.liveLabel,
    progress: status.liveActive ? 1 : status.vdjBridgeOk ? 0.35 : 0.1,
    status: tone,
    statusLabel,
    lastEvent,
    attentionBadges,
    lastUpdated: status.updatedAt,
    secondaryMetrics: [
      { label: "Bridge", value: status.vdjBridgeLabel },
      { label: "System", value: status.systemLabel },
      { label: "RVTR", value: status.liveRvtr ?? "—" },
    ],
    action: "Control",
    actionHref: status.liveActive ? "/ops/live" : "/ops/live-control",
  });
}

function buildBridgeModule(status: CommandCenterStatus): CommandCenterModule {
  const lastEvent = status.vdjBridgeOk
    ? status.bridgeHeartbeat
      ? `Last heartbeat ${formatEventIso(status.bridgeHeartbeat) ?? status.bridgeHeartbeat}`
      : "Bridge process running"
    : status.bridgeHeartbeat
      ? `Last seen ${formatEventIso(status.bridgeHeartbeat) ?? status.bridgeHeartbeat}`
      : "No recent activity";

  const attentionBadges = status.vdjBridgeOk ? [] : ["Bridge offline"];

  return moduleBase({
    id: "vdj-bridge",
    title: "VirtualDJ Bridge",
    primaryMetric: status.vdjBridgeLabel,
    progress: status.vdjBridgeOk ? 1 : 0,
    status: status.vdjBridgeOk ? "green" : status.systemOk ? "yellow" : "gray",
    statusLabel: status.vdjBridgeOk ? "Connected" : "Offline",
    lastEvent,
    attentionBadges,
    lastUpdated: latestIso([status.bridgeHeartbeat, status.updatedAt]),
    secondaryMetrics: [
      { label: "Live feed", value: status.liveActive ? "Active" : "Idle" },
      { label: "Bridge time", value: status.liveBridgeTimestamp ?? "—" },
      { label: "Monitor", value: "/ops/live#bridge" },
    ],
    action: "Inspect",
    actionHref: "/ops/live#bridge",
  });
}

function buildDatabaseModule(dbOk: boolean, dbPingAt: string | null): CommandCenterModule {
  const lastEvent = dbOk
    ? dbPingAt
      ? `Last successful ping ${formatEventIso(dbPingAt) ?? dbPingAt}`
      : "Postgres connected"
    : "No recent activity";

  return moduleBase({
    id: "canonical-database",
    title: "Canonical Database",
    primaryMetric: dbOk ? "Postgres connected" : "Postgres unavailable",
    progress: dbOk ? 1 : 0,
    status: dbOk ? "green" : "red",
    statusLabel: dbOk ? "Healthy" : "Broken",
    lastEvent,
    attentionBadges: dbOk ? [] : ["Database unavailable"],
    lastUpdated: dbPingAt,
    secondaryMetrics: [
      { label: "Graph", value: dbOk ? "Online" : "Offline" },
      { label: "Explorer", value: "/database-explorer" },
      { label: "Mode", value: dbOk ? "Read/write" : "Unavailable" },
    ],
    action: "Inspect",
    actionHref: "/database-explorer",
  });
}

function buildFinanceModule(finance: FinanceAttentionSummary | null): CommandCenterModule {
  const attention = finance?.count ?? 0;
  const dbAvailable = finance != null;

  let status: ModuleStatusTone = "green";
  let statusLabel = "Current";
  if (!dbAvailable) {
    status = "gray";
    statusLabel = "Unavailable";
  } else if (attention > 10) {
    status = "orange";
    statusLabel = "Action required";
  } else if (attention > 0) {
    status = "yellow";
    statusLabel = "Needs review";
  }

  let lastEvent = "No recent activity";
  if (finance?.latestLabel) {
    lastEvent = `Latest import: ${finance.latestLabel}`;
  } else if (dbAvailable && attention === 0) {
    lastEvent = "All imports current";
  }

  const attentionBadges = attention > 0 ? ["Import review needed"] : [];

  return moduleBase({
    id: "finance-operations",
    title: "Finance Operations",
    primaryMetric: dbAvailable
      ? `${formatMetricCount(attention)} items need attention`
      : "Finance database offline",
    progress: dbAvailable ? (attention === 0 ? 1 : Math.max(0.15, 1 - attention / 50)) : 0,
    status,
    statusLabel,
    lastEvent,
    attentionBadges,
    lastUpdated: finance?.latestCreatedAt ?? null,
    secondaryMetrics: [
      { label: "Imports", value: dbAvailable ? formatMetricCount(attention) : "—" },
      { label: "Latest", value: finance?.latestLabel ?? "—" },
      { label: "Reports", value: "/ops/finance/reports" },
    ],
    action: "Review",
    actionHref: attention > 0 ? "/ops/finance/import" : "/ops/finance",
  });
}

function buildResearchModule(
  packages: PackageIndexSummary,
  generatedAt: string,
): CommandCenterModule {
  const total = Math.max(packages.total, 1);
  const ready = packages.published + packages.review;

  let status: ModuleStatusTone = "green";
  let statusLabel = "Healthy";
  if (packages.total <= 0) {
    status = "gray";
    statusLabel = "Unavailable";
  } else if (packages.review > 0) {
    status = "yellow";
    statusLabel = "Review queue";
  } else if (packages.draft > packages.published) {
    status = "orange";
    statusLabel = "Build backlog";
  }

  const lastEvent =
    highlightLine("Latest review", packages.latestReview) ??
    highlightLine("Latest published", packages.latestPublished) ??
    highlightLine("Latest package", packages.latestUpdated) ??
    "No recent activity";

  const attentionBadges: string[] = [];
  if (packages.review > 0) attentionBadges.push("Needs review");
  if (packages.draft > packages.published && packages.total > 0) {
    attentionBadges.push("Build backlog");
  }

  const actionHref = packages.latestReview
    ? `/ops/intelligence/package/${packages.latestReview.rvtr}`
    : packages.latestPublished
      ? `/ops/intelligence/package/${packages.latestPublished.rvtr}`
      : "/ops/intelligence";

  return moduleBase({
    id: "research-packages",
    title: "Research Packages",
    primaryMetric: `${formatMetricCount(packages.published)} published · ${formatMetricCount(packages.review)} in review`,
    progress: ready / total,
    status,
    statusLabel,
    lastEvent,
    attentionBadges,
    lastUpdated: latestIso([
      packages.latestReview?.updatedAt,
      packages.latestPublished?.updatedAt,
      packages.latestUpdated?.updatedAt,
      packages.updatedAt,
      generatedAt,
    ]),
    secondaryMetrics: [
      { label: "Packages", value: formatMetricCount(packages.total) },
      { label: "Draft", value: formatMetricCount(packages.draft) },
      {
        label: "Latest RVTR",
        value: packages.latestUpdated?.rvtr ?? "—",
      },
    ],
    action: "Open",
    actionHref,
  });
}

function buildPublisherModule(dashboard: MissionControlDashboard): CommandCenterModule {
  const { counts, live } = dashboard;
  const waiting = counts.needsPublisher;
  const total = Math.max(counts.collectorComplete, 1);

  let status: ModuleStatusTone = "green";
  let statusLabel = "Clear";
  if (waiting > 100) {
    status = "orange";
    statusLabel = "Action required";
  } else if (waiting > 0) {
    status = "yellow";
    statusLabel = "Awaiting review";
  } else if (counts.collectorComplete <= 0) {
    status = "gray";
    statusLabel = "Unavailable";
  }

  const lastEvent = live.lastPublished
    ? `Last published: ${formatSongLine(
        live.lastPublished.artist,
        live.lastPublished.title,
        live.lastPublished.rvtr,
      )}`
    : "No recent activity";

  const attentionBadges = waiting > 0 ? ["Awaiting publish"] : [];

  const actionHref =
    waiting > 0
      ? "/ops/studio/publisher"
      : live.lastPublished
        ? `/ops/studio/publisher/${live.lastPublished.rvtr}`
        : "/ops/studio/publisher";

  return moduleBase({
    id: "publisher-queue",
    title: "Publisher Queue",
    primaryMetric: `${formatMetricCount(waiting)} awaiting publish`,
    progress: counts.published / total,
    status,
    statusLabel,
    lastEvent,
    attentionBadges,
    lastUpdated: latestIso([
      dashboard.generatedAt,
      live.lastPublished?.publishedAt ?? null,
    ]),
    secondaryMetrics: [
      { label: "Published", value: formatMetricCount(counts.published) },
      { label: "Creative review", value: formatMetricCount(counts.needsCreativeReview) },
      { label: "Last RVTR", value: live.lastPublished?.rvtr ?? "—" },
    ],
    action: "Publish",
    actionHref,
  });
}

function overallFromModules(modules: CommandCenterModule[]): {
  status: ModuleStatusTone;
  headline: string;
  detail: string;
} {
  const priority: ModuleStatusTone[] = ["red", "orange", "yellow", "blue", "green", "gray"];

  const active = modules.find((module) => module.status === "blue");
  const broken = modules.filter((module) => module.status === "red").length;
  const attention = modules.filter((module) =>
    ["orange", "yellow"].includes(module.status),
  ).length;

  if (broken > 0) {
    return {
      status: "red",
      headline: "Systems Need Attention",
      detail: `${broken} subsystem${broken === 1 ? "" : "s"} reporting failures.`,
    };
  }
  if (active) {
    return {
      status: "blue",
      headline: "Mission Active",
      detail: active.statusLabel,
    };
  }
  if (attention > 0) {
    return {
      status: "yellow",
      headline: "Operational With Backlog",
      detail: `${attention} area${attention === 1 ? "" : "s"} need operator review.`,
    };
  }
  return {
    status: "green",
    headline: "All Systems Operational",
    detail: "Retroverse Command Center is ready for production work.",
  };
}

export function buildCommandCenterDashboard(input: {
  mission: MissionControlDashboard;
  status: CommandCenterStatus;
  dbOk: boolean;
  dbPingAt: string | null;
  finance: FinanceAttentionSummary | null;
  packages: PackageIndexSummary;
}): CommandCenterDashboard {
  const generatedAt = new Date().toISOString();
  const modules: CommandCenterModule[] = [
    buildStudioPipelineModule(input.mission),
    buildProductionLibraryModule(input.mission),
    buildLibraryQueueModule(input.mission),
    buildLiveModule(input.status),
    buildBridgeModule(input.status),
    buildDatabaseModule(input.dbOk, input.dbPingAt),
    buildFinanceModule(input.finance),
    buildResearchModule(input.packages, generatedAt),
    buildPublisherModule(input.mission),
  ];

  const overall = overallFromModules(modules);

  return {
    generatedAt,
    overallStatus: overall.status,
    overallHeadline: overall.headline,
    overallDetail: overall.detail,
    modules,
  };
}
