import { randomUUID } from "crypto";

import { appendPipelineEvent } from "@/lib/ops/studio/department-status/pipeline-events";
import { emitCanonicalFacts } from "@/lib/ops/intelligence/canonical-facts";
import { buildCanonResearchCaptures } from "@/lib/ops/intelligence/canon-research-vault";
import { loadSongMetadata } from "@/lib/ops/intelligence/load-song-metadata";
import {
  captureWikipediaResearch,
  type WikipediaCapture,
} from "@/lib/ops/intelligence/research-capture";
import type { SongPackageMetadata } from "@/lib/ops/intelligence/song-package-types";
import { loadVdjSnapshotsForPaths } from "@/lib/ops/intelligence/vdj-database";

import {
  findVdjEntryByPath,
  findVdjMediaForSong,
  pickPreferredPerformance,
  type ResolvedCollectorSong,
} from "./pilot-songs";
import {
  avgRuntimeMs,
  completedTodayCount,
  loadCollectorProgress,
  newFactId,
  saveCollectorPackage,
  saveCollectorProgress,
} from "./store";
import {
  COLLECTOR_STAGES,
  type CollectorPackage,
  type CollectorProgress,
  type CollectorLyricsArtifact,
  type CollectorResearchFact,
  type CollectorSourceLogEntry,
  type CollectorStageId,
  type CollectorVdjMediaItem,
  type CollectorVisualAssetExtraction,
} from "./types";
import { extractVisualAssets, probeVideoDurationSec } from "./visual-extraction";
import { finalizeCollectorPackage } from "./package-finalize";
import { buildCollectorLyricsArtifact } from "./lyrics-artifact";
import { buildSongDnaPackage } from "./build-song-dna";
import { saveSongDnaPackage } from "./song-dna-store";
import { buildVisualIdentityPackage } from "./visual-identity";
import { saveVisualIdentityPackage } from "./visual-identity-store";
import { isCompilationAlbumTitle } from "./identity-resolution";

export type RunCollectorOptions = {
  onStage?: (stage: CollectorStageId, label: string, index: number) => void | Promise<void>;
};

function stageLabel(stageId: CollectorStageId): string {
  return COLLECTOR_STAGES.find((s) => s.id === stageId)?.label ?? stageId;
}

async function pushActivity(progress: CollectorProgress, message: string): Promise<void> {
  const at = new Date().toISOString();
  progress.recentActivity = [
    { id: randomUUID(), at, message },
    ...progress.recentActivity,
  ].slice(0, 40);
  await saveCollectorProgress(progress);
  await appendPipelineEvent({
    at,
    department: "collector",
    type: "activity",
    message,
    rvtr: progress.currentSong?.rvtr,
  });
}

async function setStage(
  progress: CollectorProgress,
  stageId: CollectorStageId,
  index: number,
  options?: RunCollectorOptions,
): Promise<void> {
  progress.currentStage = stageId;
  progress.currentStageLabel = stageLabel(stageId);
  progress.stageIndex = index;
  progress.status = "researching";
  await pushActivity(progress, `${stageLabel(stageId)}…`);
  await saveCollectorProgress(progress);
  await options?.onStage?.(stageId, stageLabel(stageId), index);
}

function vaultToSourceLog(
  captures: WikipediaCapture[],
  stage: CollectorStageId,
): CollectorSourceLogEntry[] {
  const now = new Date().toISOString();
  return captures.map((capture) => ({
    id: capture.id,
    source: capture.source,
    url: capture.url || null,
    capturedAt: now,
    excerpt: capture.excerpt,
    confidence: capture.confidence,
    stage,
    internalNotes: null,
  }));
}

function metadataFromResolved(
  resolved: ResolvedCollectorSong,
  mediaItems: CollectorVdjMediaItem[],
): SongPackageMetadata {
  const primary = mediaItems[0];
  return {
    rvtr: resolved.rvtr,
    artist: resolved.artist,
    title: resolved.title,
    year: primary?.year ?? null,
    albumTitle: null,
    coverUrl: null,
    peakHot100: null,
    chartWeeks: null,
    playCount: primary?.playCount ?? null,
    tags: primary?.user2 ? primary.user2.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
    hasVdjMedia: mediaItems.length > 0,
    videoInfo: primary?.filePath ?? resolved.vdjFilePath,
    relatedArtists: [],
  };
}

function factsFromVaultAndCanonical(
  metadata: SongPackageMetadata,
  vault: WikipediaCapture[],
): CollectorResearchFact[] {
  const facts: CollectorResearchFact[] = [];

  for (const canon of emitCanonicalFacts(metadata)) {
    facts.push({
      id: canon.id,
      category: canon.category,
      text: canon.factText,
      source: canon.sourceType === "canonical" ? "Retroverse Graph" : canon.sourceType,
      sourceUrl: canon.sourceUrl,
      confidence: canon.confidence,
      internalNotes: canon.locked ? "Canonical — locked" : null,
      approvalStatus: canon.locked ? "approved" : "pending",
    });
  }

  if (metadata.year != null) {
    const isCompilation = isCompilationAlbumTitle(metadata.albumTitle);
    facts.push({
      id: newFactId(),
      category: isCompilation ? "album" : "recording",
      text: isCompilation
        ? `Graph compilation anchor: "${metadata.albumTitle}" (${metadata.year}) — not the song's original release year.`
        : `${metadata.title} was released in ${metadata.year}.`,
      source: "Retroverse Graph",
      sourceUrl: null,
      confidence: 1,
      internalNotes: isCompilation ? "Compilation anchor — scoped to recording" : "Canonical — locked",
      approvalStatus: "approved",
      scope: isCompilation ? "recording" : "song",
    });
  }

  for (const capture of vault) {
    const sentences = capture.excerpt
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 40 && s.length <= 320)
      .slice(0, 3);

    for (const sentence of sentences) {
      facts.push({
        id: newFactId(),
        category: capture.source.includes("Wikipedia") ? "cultural_impact" : "trivia",
        text: sentence,
        source: capture.source,
        sourceUrl: capture.url || null,
        confidence: Math.min(capture.confidence, 0.82),
        internalNotes:
          capture.confidence < 0.75
            ? "Lower confidence — internal research only"
            : null,
        approvalStatus: "pending",
      });
    }
  }

  return facts;
}

function computeResearchQuality(pkg: CollectorPackage): number {
  let score = 0;
  if (pkg.graphLinked) score += 15;
  if (pkg.virtualDj.mediaItems.length > 0) score += 15;
  if (pkg.charts.peakHot100 != null) score += 15;
  if (pkg.recording.notes.length > 0) score += 10;
  if (pkg.videoPerformance.items.length > 0) score += 15;
  if (pkg.visualAssets.extraction.extractedCount > 0) score += 10;
  if (pkg.visualAssets.coverUrl) score += 10;
  if (pkg.culturalContext.notes.length > 0) score += 10;
  score += Math.min(20, pkg.candidateFacts.length * 2);
  score -= Math.min(15, pkg.missingAreas.length * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function detectMissingAreas(pkg: Omit<CollectorPackage, "missingAreas" | "researchQuality">): string[] {
  const missing: string[] = [];
  if (!pkg.graphLinked) missing.push("Retroverse graph linkage");
  if (pkg.charts.peakHot100 == null) missing.push("Billboard chart history");
  if (pkg.recording.notes.length === 0) missing.push("Recording session details");
  if (pkg.videoPerformance.items.length === 0) missing.push("Owned video or performance footage");
  if (pkg.visualAssets.extraction.skipped && pkg.videoPerformance.items.length > 0) {
    missing.push("Visual reference library");
  }
  if (!pkg.visualAssets.coverUrl && pkg.visualAssets.extraction.extractedCount === 0) {
    missing.push("Canonical cover art");
  }
  if (pkg.culturalContext.notes.length === 0) missing.push("Cultural context sources");
  if (pkg.relationships.relatedArtists.length <= 1) missing.push("Artist relationship depth");
  if (pkg.candidateFacts.filter((f) => f.confidence >= 0.8).length < 3) {
    missing.push("High-confidence candidate facts");
  }
  return missing;
}

export async function runCollectorForSong(
  resolved: ResolvedCollectorSong,
  options: RunCollectorOptions = {},
): Promise<CollectorPackage> {
  const progress = await loadCollectorProgress();
  progress.currentSong = {
    rvtr: resolved.rvtr,
    artist: resolved.artist,
    title: resolved.title,
  };
  progress.status = "researching";
  progress.startedAt = new Date().toISOString();
  await saveCollectorProgress(progress);
  await appendPipelineEvent({
    at: progress.startedAt,
    department: "collector",
    type: "started",
    message: `Research started — ${resolved.title}`,
    rvtr: resolved.rvtr,
  });

  const stageResults = {} as CollectorPackage["stages"];
  const sourceLog: CollectorSourceLogEntry[] = [];
  let metadata: SongPackageMetadata | null = null;
  let mediaItems: CollectorVdjMediaItem[] = [];
  let vault: WikipediaCapture[] = [];
  let candidateFacts: CollectorResearchFact[] = [];
  let lyrics: CollectorLyricsArtifact = { available: false };

  // 1 Identity
  await setStage(progress, "identity", 1, options);
  mediaItems = await findVdjMediaForSong({
    artist: resolved.artist,
    title: resolved.title,
    preferredPath: resolved.vdjFilePath,
    performanceHints: resolved.performanceHints,
  });
  if (mediaItems.length === 0 && resolved.vdjFilePath) {
    const direct = await findVdjEntryByPath(resolved.vdjFilePath);
    if (direct) mediaItems = [direct];
  }

  if (resolved.graphLinked) {
    metadata = await loadSongMetadata(resolved.rvtr);
  }
  if (!metadata) {
    metadata = metadataFromResolved(resolved, mediaItems);
  } else if (mediaItems[0]?.filePath) {
    const vdjMeta = await loadVdjSnapshotsForPaths([mediaItems[0].filePath]);
    const snap = vdjMeta.get(mediaItems[0].filePath.replace(/\\/g, "/").toLowerCase());
    if (snap) metadata = { ...metadata, vdjSnapshot: snap, playCount: snap.playCount ?? metadata.playCount };
  }

  stageResults.identity = {
    status: "complete",
    summary: `${metadata.artist} — ${metadata.title} (${resolved.rvtr})`,
  };

  // 2 Retroverse / VDJ
  await setStage(progress, "retroverse_vdj", 2, options);
  const canonCaptures = buildCanonResearchCaptures(metadata);
  vault = [...canonCaptures];
  for (const item of mediaItems.slice(0, 8)) {
    vault.push({
      id: `vdj-media-${randomUUID().slice(0, 8)}`,
      source: "VirtualDJ Library",
      url: "",
      title: `${item.title} — ${item.isVideo ? "video" : "audio"}`,
      excerpt: [
        item.filePath,
        item.playCount != null ? `Plays: ${item.playCount}` : null,
        item.performanceLabel ? `Performance: ${item.performanceLabel}` : null,
        item.user2 ? `Tags: ${item.user2}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      confidence: 0.99,
    });
  }
  sourceLog.push(...vaultToSourceLog(canonCaptures, "retroverse_vdj"));
  sourceLog.push(...vaultToSourceLog(vault.filter((v) => v.source === "VirtualDJ Library"), "retroverse_vdj"));
  stageResults.retroverse_vdj = {
    status: mediaItems.length > 0 || resolved.graphLinked ? "complete" : "partial",
    summary: `${mediaItems.length} library items · graph ${resolved.graphLinked ? "linked" : "pending"}`,
  };

  // 3 Charts
  await setStage(progress, "charts", 3, options);
  const chartSummary =
    metadata.peakHot100 != null
      ? `Hot 100 peak #${metadata.peakHot100}${metadata.chartWeeks ? ` · ${metadata.chartWeeks} weeks` : ""}`
      : "No chart history in graph";
  stageResults.charts = {
    status: metadata.peakHot100 != null ? "complete" : "partial",
    summary: chartSummary,
  };

  // 4 Recording
  await setStage(progress, "recording", 4, options);
  const wikiEarly = await captureWikipediaResearch({
    artist: metadata.artist,
    title: metadata.title,
    albumTitle: metadata.albumTitle,
  });
  vault = [...vault, ...wikiEarly];
  sourceLog.push(...vaultToSourceLog(wikiEarly, "recording"));

  const lyricsResult = await buildCollectorLyricsArtifact(wikiEarly).catch(
    (): CollectorLyricsArtifact => ({ available: false }),
  );
  lyrics = lyricsResult;

  const recordingNotes = wikiEarly
    .flatMap((capture) =>
      capture.excerpt
        .split(/(?<=[.!?])\s+/)
        .filter((s) => /record|studio|produc|written|compos|session/i.test(s))
        .slice(0, 2),
    )
    .slice(0, 4);

  stageResults.recording = {
    status: recordingNotes.length > 0 ? "complete" : "partial",
    summary:
      recordingNotes.length > 0
        ? `${recordingNotes.length} recording notes captured${lyrics.available ? " · lyrics stored" : ""}`
        : lyrics.available
          ? "Lyrics artifact captured"
          : "Limited recording detail available",
  };

  // 5 Video / Performance
  await setStage(progress, "video_performance", 5, options);
  const preferred = pickPreferredPerformance(mediaItems, resolved.performanceHints);
  const videoItems = mediaItems.filter((item) => item.isVideo);
  const sourceVideoPath = preferred?.filePath ?? videoItems[0]?.filePath ?? null;
  stageResults.video_performance = {
    status: videoItems.length > 0 ? "complete" : "partial",
    summary:
      videoItems.length > 0
        ? `${videoItems.length} performance videos${preferred?.performanceLabel ? ` · ${preferred.performanceLabel}` : ""}`
        : "No owned performance video identified",
  };

  // 6 Visual Asset Extraction
  await setStage(progress, "visual_asset_extraction", 6, options);
  let visualExtraction: CollectorVisualAssetExtraction = {
    skipped: true,
    skipReason: "No local performance video available",
    sourceVideo: null,
    frameIntervalSec: 20,
    extractedCount: 0,
    assets: [],
  };

  if (sourceVideoPath) {
    visualExtraction = await extractVisualAssets({
      rvtr: resolved.rvtr,
      videoPath: sourceVideoPath,
      onProgress: async (message) => {
        await pushActivity(progress, message);
      },
    });
  }

  stageResults.visual_asset_extraction = {
    status: visualExtraction.skipped ? "skipped" : "complete",
    summary: visualExtraction.skipped
      ? visualExtraction.skipReason ?? "Skipped — no local video"
      : `${visualExtraction.extractedCount} curated visual assets`,
  };

  // 7 Cultural Context
  await setStage(progress, "cultural_context", 7, options);
  const culturalNotes = wikiEarly
    .flatMap((capture) =>
      capture.excerpt
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.length >= 50)
        .slice(0, 2),
    )
    .slice(0, 4);
  stageResults.cultural_context = {
    status: culturalNotes.length > 0 ? "complete" : "partial",
    summary:
      culturalNotes.length > 0
        ? `${culturalNotes.length} cultural context notes`
        : "Cultural context thin",
  };

  // 8 Visual Assets
  await setStage(progress, "visual_assets", 8, options);
  const extractedPaths = visualExtraction.assets.map((asset) => asset.filename);
  const visualInventory = [
    metadata.coverUrl,
    ...extractedPaths,
    ...videoItems.map((item) => item.filePath),
  ].filter(Boolean) as string[];
  stageResults.visual_assets = {
    status: visualInventory.length > 0 ? "complete" : "partial",
    summary:
      visualExtraction.extractedCount > 0
        ? `${visualExtraction.extractedCount} curated frames · ${visualInventory.length} visual items`
        : `${visualInventory.length} visual assets inventoried`,
  };

  // 9 Relationships
  await setStage(progress, "relationships", 9, options);
  const relatedArtists = [
    metadata.artist,
    ...(metadata.relatedArtists ?? []),
  ].filter((name, index, arr) => arr.indexOf(name) === index);
  stageResults.relationships = {
    status: relatedArtists.length > 1 ? "complete" : "partial",
    summary: `${relatedArtists.length} related artists in scope`,
  };

  // 10 Candidate Facts
  await setStage(progress, "candidate_facts", 10, options);
  candidateFacts = factsFromVaultAndCanonical(metadata, vault);
  stageResults.candidate_facts = {
    status: candidateFacts.length > 0 ? "complete" : "partial",
    summary: `${candidateFacts.length} candidate facts gathered`,
  };

  const preferredPerformance = preferred?.performanceLabel ?? preferred?.filePath ?? null;
  const identityNotes = [...resolved.notes];
  if (resolved.performanceHints.length > 0 && !preferred?.performanceLabel?.match(/paris/i)) {
    identityNotes.push(
      "Paris / Finally Tour performance not identified in library — closest owned performance footage selected.",
    );
  }

  const partialPkg = {
    version: 1 as const,
    rvtr: resolved.rvtr,
    artist: metadata.artist,
    title: metadata.title,
    graphLinked: resolved.graphLinked,
    identityNotes,
    status: "complete" as const,
    completedAt: new Date().toISOString(),
    researchQuality: 0,
    stages: stageResults,
    identity: {
      rvtr: resolved.rvtr,
      artist: metadata.artist,
      title: metadata.title,
      year: metadata.year,
      albumTitle: metadata.albumTitle,
    },
    virtualDj: {
      primaryPath: mediaItems[0]?.filePath ?? resolved.vdjFilePath,
      playCount: metadata.playCount,
      tags: metadata.tags,
      mediaItems,
    },
    charts: {
      peakHot100: metadata.peakHot100,
      chartWeeks: metadata.chartWeeks,
      albumTitle: metadata.albumTitle,
      summary: chartSummary,
    },
    recording: {
      summary: stageResults.recording.summary,
      notes: recordingNotes,
    },
    videoPerformance: {
      summary: stageResults.video_performance.summary,
      items: videoItems,
      preferredPerformance,
    },
    culturalContext: {
      summary: stageResults.cultural_context.summary,
      notes: culturalNotes,
    },
    visualAssets: {
      coverUrl: metadata.coverUrl,
      inventory: visualInventory,
      extraction: visualExtraction,
    },
    relationships: {
      relatedArtists,
      summary: stageResults.relationships.summary,
    },
    candidateFacts,
    missingAreas: [] as string[],
    sourceLog,
    lyrics,
    summary: {
      researchSummary: "",
      sourceSummary: "",
    },
  };

  // 11 Missing Information
  await setStage(progress, "missing_information", 11, options);
  const missingAreas = detectMissingAreas(partialPkg);
  stageResults.missing_information = {
    status: "complete",
    summary: missingAreas.length > 0 ? `${missingAreas.length} gaps noted` : "No major gaps",
  };

  // 12 Source Log
  await setStage(progress, "source_log", 12, options);
  stageResults.source_log = {
    status: "complete",
    summary: `${sourceLog.length} sources logged`,
  };

  const researchQuality = computeResearchQuality({ ...partialPkg, missingAreas });
  const basePkg: CollectorPackage = {
    ...partialPkg,
    stages: stageResults,
    missingAreas,
    researchQuality,
    status: missingAreas.length > 3 ? "partial" : "complete",
    summary: {
      researchSummary: [
        `${metadata.artist} — ${metadata.title}`,
        chartSummary,
        stageResults.video_performance.summary,
        `${candidateFacts.length} candidate facts · ${missingAreas.length} gaps`,
      ].join(" · "),
      sourceSummary: `${sourceLog.length} sources across Retroverse, VirtualDJ, and Wikipedia${lyrics.available ? " · lyrics artifact" : ""}`,
    },
  };

  const durationSec = sourceVideoPath ? await probeVideoDurationSec(sourceVideoPath) : null;
  const pkg = finalizeCollectorPackage(basePkg, {
    primaryVideoPath: sourceVideoPath,
    primaryExtraction: visualExtraction,
    durationSec,
  });

  const visualIdentity = await buildVisualIdentityPackage(pkg);
  await saveVisualIdentityPackage(visualIdentity);

  const songDna = await buildSongDnaPackage(pkg, visualIdentity);
  await saveSongDnaPackage(songDna);

  await saveCollectorPackage(pkg);
  return pkg;
}

export async function markCollectorWaiting(queue: number): Promise<void> {
  const progress = await loadCollectorProgress();
  progress.status = "waiting";
  progress.queue = queue;
  progress.currentStage = null;
  progress.currentStageLabel = null;
  await pushActivity(progress, "Waiting for next song…");
}

export async function markCollectorIdle(): Promise<void> {
  const progress = await loadCollectorProgress();
  progress.status = "idle";
  progress.currentSong = null;
  progress.currentStage = null;
  progress.currentStageLabel = null;
  progress.queue = 0;
  await saveCollectorProgress(progress);
}

export async function recordCollectorCompletion(input: {
  rvtr: string;
  artist: string;
  title: string;
  researchQuality: number;
  runtimeMs: number;
}): Promise<void> {
  const progress = await loadCollectorProgress();
  progress.recentlyCompleted = [
    {
      rvtr: input.rvtr,
      artist: input.artist,
      title: input.title,
      completedAt: new Date().toISOString(),
      researchQuality: input.researchQuality,
      runtimeMs: input.runtimeMs,
    },
    ...progress.recentlyCompleted,
  ].slice(0, 20);
  progress.currentSong = null;
  progress.currentStage = null;
  progress.currentStageLabel = null;
  progress.researchQuality = input.researchQuality;
  progress.status = progress.queue > 0 ? "waiting" : "complete";
  progress.avgRuntimeMs = avgRuntimeMs(progress.recentlyCompleted);
  progress.completedToday = completedTodayCount(progress.recentlyCompleted);
  await pushActivity(progress, `Completed ${input.title}`);
  await saveCollectorProgress(progress);
}
