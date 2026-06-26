/**
 * Collector 2.0 — curator-facing presentation layer.
 * Translates pipeline JSON into language a music historian would use.
 */

import type {
  CollectorActivityEntry,
  CollectorDashboardStats,
  CollectorPackage,
  CollectorPerformance,
  CollectorRunStatus,
  CollectorStageId,
  CollectorStageResult,
  CollectorVisualAssetCategory,
  CollectorVisualAssetExtraction,
} from "./types";
import { attachArchiveStructure, defaultPerformanceId } from "./package-archive";
import { buildEditorHandoff } from "./package-handoff";
import type { EditorHandoffView } from "./package-contract";
import { visualAssetUrl } from "./visual-asset-url";

export type KnowledgeTier = "Excellent" | "Strong" | "Developing" | "Early";

export type PackageCardStatus = "Ready" | "Partial" | "Missing";

export type VisualAssetSlotView = {
  category: CollectorVisualAssetCategory | "Waiting";
  label: string;
  imageUrl: string | null;
  status: "ready" | "waiting" | "unavailable";
};

export type PerformanceSummary = {
  id: string;
  title: string;
  qualityScore: number;
  detectedVenue: string | null;
  detectedYear: number | null;
  confidence: number;
};

export type CollectorInvestigationView = {
  statusHeadline: string;
  artist: string | null;
  title: string | null;
  coverUrl: string | null;
  activityLine: string;
  knowledgeTier: KnowledgeTier;
  knowledgeBar: string;
  stillLookingFor: string[];
  discoveries: string[];
  packageCards: Array<{ label: string; status: PackageCardStatus }>;
  recentDiscoveries: Array<{ at: string; time: string; message: string }>;
  collectorNotes: string;
  visualAssets: VisualAssetSlotView[];
  visualAssetsMessage: string;
  performances: PerformanceSummary[];
  selectedPerformanceId: string | null;
  performanceFacts: string[];
  handoff: EditorHandoffView;
};

export type CollectorDashboardCardView = {
  mood: "Working" | "Ready" | "Resting";
  currentLabel: string;
  todayDiscoveries: number;
  songsCompleted: number;
  knowledgeAdded: KnowledgeTier;
};

export const FUTURE_ANALYSIS_HOOKS = [
  "Visual Analysis",
  "Scene Detection",
  "Face Recognition",
  "Performance Recognition",
  "Object Recognition",
  "Poster Detection",
  "Album Match",
] as const;

const DISPLAY_ASSET_SLOTS: CollectorVisualAssetCategory[] = [
  "Hero",
  "Performance",
  "Close-up",
  "Alternate",
];

const SONG_PACKAGE_CARD_MAP: Array<{ id: CollectorStageId; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "charts", label: "Charts" },
  { id: "recording", label: "Recording" },
  { id: "cultural_context", label: "Culture" },
  { id: "relationships", label: "Relationships" },
  { id: "source_log", label: "Sources" },
];

const STAGE_ACTIVITY: Partial<Record<CollectorStageId, string>> = {
  identity: "Confirming song identity…",
  retroverse_vdj: "Searching library and graph records…",
  charts: "Looking up chart history…",
  recording: "Researching recording session…",
  video_performance: "Searching for television performances…",
  visual_asset_extraction: "Preparing visual reference library…",
  cultural_context: "Gathering cultural context…",
  visual_assets: "Collecting photographs and artwork…",
  relationships: "Mapping related artists…",
};

const HIDDEN_ACTIVITY_PREFIXES = ["Candidate Facts", "Missing Information", "Source Log"];

const MISSING_AREA_LABELS: Record<string, string> = {
  "Retroverse graph linkage": "Graph connection",
  "Billboard chart history": "Billboard history",
  "Recording session details": "Recording session",
  "Canonical cover art": "Original cover",
  "Cultural context sources": "Cultural background",
  "Artist relationship depth": "Artist relationships",
  "Visual reference library": "Visual reference library",
};

export function normalizeCollectorPackage(pkg: CollectorPackage): CollectorPackage {
  const baseVisual = pkg.visualAssets ?? { coverUrl: null, inventory: [] };
  const rawExtraction = baseVisual.extraction;
  const assets = Array.isArray(rawExtraction?.assets) ? rawExtraction.assets : [];
  const extraction: CollectorVisualAssetExtraction = {
    skipped: rawExtraction?.skipped ?? assets.length === 0,
    skipReason:
      rawExtraction?.skipReason ??
      (assets.length === 0 ? emptyVisualExtraction().skipReason : null),
    sourceVideo: rawExtraction?.sourceVideo ?? null,
    frameIntervalSec: rawExtraction?.frameIntervalSec ?? 20,
    extractedCount:
      typeof rawExtraction?.extractedCount === "number"
        ? rawExtraction.extractedCount
        : assets.length,
    assets,
  };

  return attachArchiveStructure({
    ...pkg,
    visualAssets: {
      coverUrl: baseVisual.coverUrl ?? null,
      inventory: Array.isArray(baseVisual.inventory) ? baseVisual.inventory : [],
      extraction,
    },
  });
}

function emptyVisualExtraction(): CollectorVisualAssetExtraction {
  return {
    skipped: true,
    skipReason: "Visual assets have not been prepared yet",
    sourceVideo: null,
    frameIntervalSec: 20,
    extractedCount: 0,
    assets: [],
  };
}

export function knowledgeTierFromScore(score: number | null | undefined): KnowledgeTier {
  if (score == null || score < 0) return "Early";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 30) return "Developing";
  return "Early";
}

export function knowledgeBar(score: number | null | undefined): string {
  const filled =
    score == null ? 0 : Math.max(0, Math.min(10, Math.round(score / 10)));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

export function parseSongLine(line: string): { artist: string; title: string } | null {
  if (!line || line === "—") return null;
  const sep = line.indexOf(" — ");
  if (sep === -1) return { artist: line.trim(), title: "" };
  return {
    artist: line.slice(0, sep).trim(),
    title: line.slice(sep + 3).trim(),
  };
}

function humanizeMissingArea(area: string): string {
  return MISSING_AREA_LABELS[area] ?? area.replace(/\b\w/g, (c) => c.toUpperCase());
}

function stageToCardStatus(stage: CollectorStageResult | undefined): PackageCardStatus {
  if (!stage) return "Missing";
  if (stage.status === "complete") return "Ready";
  if (stage.status === "partial" || stage.status === "skipped") return "Partial";
  return "Missing";
}

function translateActivityMessage(message: string): string | null {
  if (HIDDEN_ACTIVITY_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return null;
  }

  if (message.startsWith("Completed ")) return "Research complete";
  if (message.startsWith("Waiting for next song")) return "Preparing next song…";

  const stagePrefix = message.replace(/…$/, "");
  const stageMap: Record<string, string> = {
    Identity: "Confirming song identity…",
    "Retroverse / VirtualDJ": "Searching library and graph records…",
    Charts: "Looking up chart history…",
    Recording: "Researching recording session…",
    "Video / Performance": "Searching for television performances…",
    "Visual Asset Extraction": "Preparing visual reference library…",
    "Cultural Context": "Gathering cultural context…",
    "Visual Assets": "Collecting photographs and artwork…",
    Relationships: "Mapping related artists…",
  };

  if (stageMap[stagePrefix]) return stageMap[stagePrefix];
  if (message.endsWith("…")) return message;
  return message;
}

export function buildDiscoveries(pkg: CollectorPackage): string[] {
  const out: string[] = [];
  const song = pkg.song;

  if (pkg.charts?.peakHot100 != null || pkg.stages?.charts?.status === "complete") {
    out.push("Found Billboard history");
  }

  const cultureNotes = song?.culture.notes ?? pkg.culturalContext?.notes ?? [];
  const sourceLog = song?.sources.sourceLog ?? pkg.sourceLog ?? [];

  if (
    sourceLog.some((entry) => entry.source.toLowerCase().includes("wikipedia")) ||
    cultureNotes.some((note) => note.toLowerCase().includes("wikipedia"))
  ) {
    out.push("Located Wikipedia article");
  }

  if ((pkg.performances?.length ?? pkg.videoPerformance?.items?.length ?? 0) > 0) {
    out.push("Matched VirtualDJ performance");
  }

  const albumTitle = song?.identity.albumTitle ?? pkg.identity?.albumTitle;
  if (albumTitle) {
    out.push("Identified album");
  }

  if ((pkg.performances?.length ?? 0) > 1) {
    out.push(`Cataloged ${pkg.performances!.length} performances`);
  } else if ((pkg.videoPerformance?.items?.length ?? 0) > 0) {
    out.push("Found live performance");
  }

  const relatedArtists = song?.relationships.relatedArtists ?? pkg.relationships?.relatedArtists ?? [];
  if (relatedArtists.length > 0) {
    out.push("Found related artists");
  }

  const recordingNotes = song?.recording.notes ?? pkg.recording?.notes ?? [];
  if (recordingNotes.length > 0 || pkg.stages?.recording?.status === "complete") {
    out.push("Found recording details");
  }

  const coverUrl = song?.coverUrl ?? pkg.visualAssets?.coverUrl;
  if (coverUrl) {
    out.push("Matched album artwork");
  }

  const extractedCount = pkg.visualAssets?.extraction?.extractedCount ?? 0;
  if (extractedCount > 0) {
    out.push("Built visual reference library");
  }

  if (cultureNotes.length > 0) {
    out.push("Gathered cultural context");
  }

  if (sourceLog.length > 0 && !out.some((d) => d.includes("Wikipedia"))) {
    out.push("Cataloged reference sources");
  }

  return out;
}

function buildSongCollectorNotes(pkg: CollectorPackage): string {
  const strengths: string[] = [];
  const performanceCount = pkg.performances?.length ?? pkg.videoPerformance?.items?.length ?? 0;

  if (pkg.charts?.peakHot100 != null) strengths.push("strong chart history");
  if (performanceCount > 2) strengths.push("excellent video coverage");
  else if (performanceCount === 1) strengths.push("performance footage on file");
  const cultureNotes = pkg.song?.culture.notes ?? pkg.culturalContext?.notes ?? [];
  if (cultureNotes.length > 2) strengths.push("rich cultural context");
  const albumTitle = pkg.song?.identity.albumTitle ?? pkg.identity?.albumTitle;
  if (albumTitle) strengths.push("a clear album anchor");
  if ((pkg.visualAssets?.extraction?.extractedCount ?? 0) > 0) {
    strengths.push("a curated visual reference library");
  }

  const paragraphs: string[] = [];
  const missingAreas = pkg.song?.missingAreas ?? pkg.missingAreas ?? [];

  if (strengths.length >= 2) {
    paragraphs.push(`This song has ${strengths.slice(0, 2).join(" and ")}.`);
  } else if (strengths.length === 1) {
    paragraphs.push(`This song has ${strengths[0]}.`);
  } else {
    paragraphs.push("This song is still building its research record.");
  }

  if (missingAreas.length > 0) {
    const gaps = missingAreas.map(humanizeMissingArea).slice(0, 3);
    const joined =
      gaps.length === 1
        ? gaps[0]
        : gaps.length === 2
          ? `${gaps[0]} and ${gaps[1]}`
          : `${gaps.slice(0, -1).join(", ")}, and ${gaps[gaps.length - 1]}`;
    paragraphs.push(`The biggest missing area is ${joined.toLowerCase()}.`);
  }

  if (
    performanceCount > 0 &&
    missingAreas.some((area) => /tv|television|appearance/i.test(area))
  ) {
    paragraphs.push("Additional television appearances may still exist.");
  } else if (missingAreas.some((area) => /recording session/i.test(area))) {
    paragraphs.push("Session documentation may surface in future digging.");
  }

  return paragraphs.join("\n\n");
}

function investigationHeadline(status: CollectorRunStatus, hasPackage: boolean): string {
  if (status === "researching" || status === "waiting") return "Researching";
  if (status === "complete" || hasPackage) return "Research complete";
  return "Standing by";
}

function activityLine(
  status: CollectorRunStatus,
  progress: CollectorDashboardStats["progress"],
  pkg: CollectorPackage | null,
): string {
  if (status === "idle" && !pkg) {
    return "Waiting for the next research assignment.";
  }

  if (status === "researching" || status === "waiting") {
    const latest = progress.recentActivity[0]?.message;
    if (latest && !latest.match(/^[A-Za-z /]+…$/)) {
      return latest;
    }
    if (progress.currentStage && STAGE_ACTIVITY[progress.currentStage]) {
      return STAGE_ACTIVITY[progress.currentStage]!;
    }
    if (progress.currentStageLabel) {
      const translated = translateActivityMessage(`${progress.currentStageLabel}…`);
      if (translated) return translated;
    }
    return "Following research leads…";
  }

  if (pkg) {
    const lastDiscovery = buildDiscoveries(pkg).at(-1);
    if (lastDiscovery) return lastDiscovery;
  }

  return "Research file closed — ready for the next song.";
}

function heroImageUrl(pkg: CollectorPackage | null): string | null {
  if (!pkg) return null;
  const hero = pkg.visualAssets?.extraction?.assets?.find((asset) => asset.category === "Hero");
  if (hero) return visualAssetUrl(pkg.rvtr, hero.filename);
  return pkg.song?.coverUrl ?? pkg.visualAssets?.coverUrl ?? null;
}

function buildVisualAssetSlotsFromExtraction(
  rvtr: string,
  extraction: CollectorVisualAssetExtraction | undefined,
): VisualAssetSlotView[] {
  const slots: VisualAssetSlotView[] = DISPLAY_ASSET_SLOTS.map((category) => ({
    category,
    label: category,
    imageUrl: null,
    status: "waiting" as const,
  }));

  const assets = extraction?.assets ?? [];
  for (const asset of assets) {
    const slot = slots.find((entry) => entry.category === asset.category);
    if (slot) {
      slot.imageUrl = visualAssetUrl(rvtr, asset.filename);
      slot.status = "ready";
    }
  }

  return slots;
}

function buildVisualAssetSlots(
  pkg: CollectorPackage | null,
  performance?: CollectorPerformance | null,
): VisualAssetSlotView[] {
  if (!pkg) {
    return DISPLAY_ASSET_SLOTS.map((category) => ({
      category,
      label: category,
      imageUrl: null,
      status: "waiting" as const,
    }));
  }

  const extraction =
    performance?.visualAssets.extraction ?? pkg.visualAssets?.extraction;
  return buildVisualAssetSlotsFromExtraction(pkg.rvtr, extraction);
}

function visualAssetsMessage(
  pkg: CollectorPackage | null,
  isResearching: boolean,
  performance?: CollectorPerformance | null,
): string {
  if (!pkg) {
    return isResearching
      ? "Visual assets are being prepared…"
      : "Visual assets have not been prepared yet.";
  }

  const extraction =
    performance?.visualAssets.extraction ?? pkg.visualAssets?.extraction;
  const extractedCount = extraction?.extractedCount ?? 0;

  if (extractedCount > 0) {
    const performanceLabel = performance?.title ? ` for ${performance.title}` : "";
    return `${extractedCount} curated visual references on file${performanceLabel}.`;
  }

  if (extraction?.skipped) {
    if (isResearching && pkg.stages?.visual_asset_extraction?.status !== "complete") {
      return "Preparing visual reference library…";
    }
    if (performance) {
      return `Visual assets have not been prepared for ${performance.title} yet.`;
    }
    return "Visual assets have not been prepared yet.";
  }

  return "Visual assets have not been prepared yet.";
}

function performanceSummaries(pkg: CollectorPackage): PerformanceSummary[] {
  return (pkg.performances ?? []).map((performance) => ({
    id: performance.id,
    title: performance.title,
    qualityScore: performance.qualityScore,
    detectedVenue: performance.detectedVenue,
    detectedYear: performance.detectedYear,
    confidence: performance.confidence,
  }));
}

function resolvePerformance(
  pkg: CollectorPackage,
  performanceId?: string | null,
): CollectorPerformance | null {
  const list = pkg.performances ?? [];
  if (list.length === 0) return null;
  if (!performanceId) return list[0] ?? null;
  return list.find((entry) => entry.id === performanceId) ?? list[0] ?? null;
}

export function coalesceInvestigationView(
  view: CollectorInvestigationView | null | undefined,
): CollectorInvestigationView {
  const emptyHandoff: EditorHandoffView = { title: "Ready for Editor", items: [] };

  if (!view) {
    return {
      statusHeadline: "Standing by",
      artist: null,
      title: null,
      coverUrl: null,
      activityLine: "",
      knowledgeTier: "Early",
      knowledgeBar: "░░░░░░░░░░",
      stillLookingFor: [],
      discoveries: [],
      packageCards: [],
      recentDiscoveries: [],
      collectorNotes: "",
      visualAssets: [],
      visualAssetsMessage: "",
      performances: [],
      selectedPerformanceId: null,
      performanceFacts: [],
      handoff: emptyHandoff,
    };
  }

  return {
    ...view,
    stillLookingFor: view.stillLookingFor ?? [],
    discoveries: view.discoveries ?? [],
    packageCards: view.packageCards ?? [],
    recentDiscoveries: view.recentDiscoveries ?? [],
    collectorNotes: view.collectorNotes ?? "",
    visualAssets: view.visualAssets ?? [],
    visualAssetsMessage: view.visualAssetsMessage ?? "",
    performances: view.performances ?? [],
    selectedPerformanceId: view.selectedPerformanceId ?? null,
    performanceFacts: view.performanceFacts ?? [],
    handoff: view.handoff ?? emptyHandoff,
  };
}

export function applyPerformanceSelection(
  view: CollectorInvestigationView,
  pkg: CollectorPackage,
  performanceId: string,
): CollectorInvestigationView {
  const base = coalesceInvestigationView(view);
  const performance = resolvePerformance(pkg, performanceId);
  if (!performance) return base;

  return {
    ...base,
    selectedPerformanceId: performance.id,
    collectorNotes: performance.collectorNotes ?? "",
    visualAssets: buildVisualAssetSlots(pkg, performance),
    visualAssetsMessage: visualAssetsMessage(pkg, false, performance),
    performanceFacts: performance.facts ?? [],
    handoff: buildEditorHandoff(pkg, performance.id),
  };
}

function resolveSongIdentity(
  stats: CollectorDashboardStats,
  pkg: CollectorPackage | null,
): { artist: string | null; title: string | null; coverUrl: string | null } {
  const hero = heroImageUrl(pkg);
  const live = stats.progress.currentSong;
  if (live) {
    return {
      artist: live.artist,
      title: live.title,
      coverUrl: hero,
    };
  }

  if (pkg) {
    return {
      artist: pkg.artist,
      title: pkg.title,
      coverUrl: hero,
    };
  }

  const parsed = parseSongLine(stats.currentSong);
  return {
    artist: parsed?.artist ?? null,
    title: parsed?.title ?? null,
    coverUrl: null,
  };
}

export function buildPackageInvestigationView(
  pkg: CollectorPackage,
  stats: CollectorDashboardStats,
  performanceId?: string | null,
): CollectorInvestigationView {
  const normalized = normalizeCollectorPackage(pkg);
  const isLive =
    stats.progress.currentSong?.rvtr === normalized.rvtr &&
    (stats.status === "researching" || stats.status === "waiting");

  const base = isLive
    ? buildInvestigationView(stats, normalized, performanceId)
    : buildInvestigationView(
        {
          ...stats,
          status: "idle",
          statusLabel: "Complete",
          currentSong: `${normalized.artist} — ${normalized.title}`,
          currentStage: "—",
          recentActivity: [],
        },
        normalized,
        performanceId,
      );

  return base;
}

export function buildInvestigationView(
  stats: CollectorDashboardStats,
  pkg: CollectorPackage | null,
  performanceId?: string | null,
): CollectorInvestigationView {
  const normalized = pkg ? normalizeCollectorPackage(pkg) : null;
  const score = normalized?.researchQuality ?? stats.progress.researchQuality;
  const song = resolveSongIdentity(stats, normalized);
  const hasPackage = Boolean(normalized);
  const isResearching = stats.status === "researching" || stats.status === "waiting";
  const performance = normalized ? resolvePerformance(normalized, performanceId) : null;
  const selectedId =
    performance?.id ?? (normalized ? defaultPerformanceId(normalized.performances ?? []) : null);
  const missingAreas = normalized?.song?.missingAreas ?? normalized?.missingAreas ?? [];

  return coalesceInvestigationView({
    statusHeadline: investigationHeadline(stats.status, hasPackage),
    artist: song.artist,
    title: song.title,
    coverUrl: song.coverUrl,
    activityLine: activityLine(stats.status, stats.progress, normalized),
    knowledgeTier: knowledgeTierFromScore(score),
    knowledgeBar: knowledgeBar(score),
    stillLookingFor: missingAreas.map(humanizeMissingArea),
    discoveries: normalized ? buildDiscoveries(normalized) : [],
    packageCards: SONG_PACKAGE_CARD_MAP.map(({ id, label }) => ({
      label,
      status: stageToCardStatus(normalized?.stages?.[id]),
    })),
    recentDiscoveries: buildRecentDiscoveries(stats.recentActivity),
    collectorNotes: performance
      ? performance.collectorNotes ?? ""
      : normalized
        ? buildSongCollectorNotes(normalized)
        : stats.status === "researching"
          ? "The Collector is still gathering material. Notes will appear when this song finishes."
          : "No research notes yet. Run a collector job to begin investigating a song.",
    visualAssets: buildVisualAssetSlots(normalized, performance),
    visualAssetsMessage: visualAssetsMessage(normalized, isResearching, performance),
    performances: normalized ? performanceSummaries(normalized) : [],
    selectedPerformanceId: selectedId,
    performanceFacts: performance?.facts ?? [],
    handoff: normalized
      ? buildEditorHandoff(normalized, selectedId)
      : { title: "Ready for Editor", items: [] },
  });
}

export function buildRecentDiscoveries(
  entries: CollectorActivityEntry[],
): Array<{ at: string; time: string; message: string }> {
  const curated: Array<{ at: string; time: string; message: string }> = [];

  for (const entry of entries) {
    const message = translateActivityMessage(entry.message);
    if (!message) continue;
    curated.push({
      at: entry.at,
      time: new Date(entry.at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
      message,
    });
  }

  return curated.slice(0, 12);
}

export function buildDashboardCardView(
  stats: CollectorDashboardStats,
  todayDiscoveries: number,
): CollectorDashboardCardView {
  const isActive = stats.status === "researching" || stats.status === "waiting";
  const parsed = parseSongLine(stats.currentSong);
  const latestScore = stats.recentlyCompleted[0]?.researchQuality ?? stats.progress.researchQuality;

  let currentLabel = "Standing by";
  if (parsed?.artist) currentLabel = parsed.artist;
  else if (isActive && stats.progress.currentSong) {
    currentLabel = stats.progress.currentSong.artist;
  }

  return {
    mood: isActive ? "Working" : stats.status === "complete" ? "Resting" : "Ready",
    currentLabel,
    todayDiscoveries,
    songsCompleted: stats.completedToday,
    knowledgeAdded: knowledgeTierFromScore(latestScore),
  };
}

export async function countTodayDiscoveries(
  recentlyCompleted: CollectorDashboardStats["recentlyCompleted"],
  loadPackage: (rvtr: string) => Promise<CollectorPackage | null>,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  let total = 0;

  for (const song of recentlyCompleted) {
    if (song.completedAt.slice(0, 10) !== today) continue;
    const pkg = await loadPackage(song.rvtr);
    if (pkg) total += pkg.candidateFacts.length;
  }

  return total;
}
