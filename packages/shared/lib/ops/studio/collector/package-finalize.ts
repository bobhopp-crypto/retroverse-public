/**
 * Collector v3 — finalize pipeline output into a permanent on-disk package.
 * Performances, fact promotion, confidence, and story seed are written once
 * at collection time — downstream departments read as-is.
 */

import type {
  CollectorDomainConfidence,
  CollectorFactApproval,
  CollectorPackage,
  CollectorPerformance,
  CollectorResearchFact,
  CollectorSongArchive,
  CollectorStorySeed,
  CollectorVdjMediaItem,
  CollectorVisualAssetExtraction,
} from "./types";
import { deriveSongArchive } from "./package-archive";
import {
  buildCanonicalModel,
  scopeResearchFacts,
  isCompilationAlbumTitle,
} from "./identity-resolution";

function emptyExtraction(): CollectorVisualAssetExtraction {
  return {
    skipped: true,
    skipReason: "Visual assets have not been prepared yet",
    sourceVideo: null,
    frameIntervalSec: 20,
    extractedCount: 0,
    assets: [],
  };
}

function performanceIdFromPath(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i += 1) {
    hash = (hash * 31 + filePath.charCodeAt(i)) | 0;
  }
  return `perf-${Math.abs(hash).toString(36)}`;
}

function normPath(path: string): string {
  return path.replace(/\\/g, "/").trim().toLowerCase();
}

function performanceTitle(item: CollectorVdjMediaItem, songTitle: string): string {
  if (item.performanceLabel?.trim()) return item.performanceLabel.trim();
  const paren = item.title.match(/\(([^)]+)\)/);
  if (paren?.[1]?.trim()) return paren[1].trim();
  if (/live/i.test(item.filePath) || /live/i.test(item.title)) return "Live";
  if (item.title.trim().toLowerCase() !== songTitle.trim().toLowerCase()) {
    return item.title.replace(songTitle, "").replace(/[()\-–—]/g, "").trim() || "Alternate";
  }
  return "Official Video";
}

function detectedVenue(label: string | null, filePath: string): string | null {
  if (label?.trim()) return label.trim();
  const paren = filePath.match(/\(([^)]+)\)/);
  if (paren?.[1] && !/live|official|video|remaster/i.test(paren[1])) return paren[1].trim();
  return null;
}

function performanceQualityScore(
  item: CollectorVdjMediaItem,
  hasVisualAssets: boolean,
): number {
  let score = 40;
  if (item.playCount != null && item.playCount > 0) score += 15;
  if (item.year != null) score += 10;
  if (item.performanceLabel) score += 15;
  if (hasVisualAssets) score += 20;
  return Math.min(100, score);
}

function performanceConfidence(item: CollectorVdjMediaItem, hasVisualAssets: boolean): number {
  let score = 0.45;
  if (item.performanceLabel) score += 0.2;
  if (item.year != null) score += 0.1;
  if (hasVisualAssets) score += 0.2;
  if (item.playCount != null && item.playCount > 0) score += 0.05;
  return Math.min(1, Math.round(score * 100) / 100);
}

function performanceNotes(item: CollectorVdjMediaItem, hasVisualAssets: boolean): string {
  const parts: string[] = [];
  if (item.performanceLabel) parts.push(`Performance label: ${item.performanceLabel}.`);
  if (item.year != null) parts.push(`Detected year: ${item.year}.`);
  if (item.playCount != null && item.playCount > 0) {
    parts.push(`VirtualDJ play count: ${item.playCount}.`);
  }
  if (hasVisualAssets) parts.push("Curated visual reference frames extracted from this footage.");
  else parts.push("Visual asset extraction not yet run for this performance.");
  return parts.join(" ");
}

function performanceFacts(item: CollectorVdjMediaItem, hasVisualAssets: boolean): string[] {
  const facts: string[] = [];
  if (item.isVideo) facts.push("Matched VirtualDJ performance video");
  if (item.performanceLabel) facts.push(`Venue or tour: ${item.performanceLabel}`);
  if (item.year != null) facts.push(`Performance year: ${item.year}`);
  if (hasVisualAssets) facts.push("Visual reference library prepared");
  return facts;
}

export type FinalizeCollectorInput = {
  primaryVideoPath: string | null;
  primaryExtraction: CollectorVisualAssetExtraction;
  durationSec?: number | null;
};

/** Build permanent performance records — one per owned video. */
export function buildPerformances(
  pkg: Pick<
    CollectorPackage,
    "title" | "videoPerformance" | "virtualDj" | "visualAssets"
  >,
  input: FinalizeCollectorInput,
): CollectorPerformance[] {
  const videoItems = (pkg.videoPerformance?.items ?? []).filter((item) => item.isVideo);
  const primaryPath =
    input.primaryVideoPath ??
    pkg.videoPerformance?.preferredPerformance ??
    pkg.virtualDj?.primaryPath ??
    null;

  if (videoItems.length === 0) return [];

  return videoItems.map((item) => {
    const isPrimary =
      primaryPath != null && normPath(item.filePath) === normPath(primaryPath);
    const perfExtraction = isPrimary ? input.primaryExtraction : emptyExtraction();
    const hasVisualAssets = perfExtraction.extractedCount > 0;

    return {
      id: performanceIdFromPath(item.filePath),
      title: performanceTitle(item, pkg.title),
      sourceVideo: item.isVideo ? item.filePath : null,
      virtualDjFilePath: item.filePath,
      durationSec: isPrimary ? (input.durationSec ?? null) : null,
      qualityScore: performanceQualityScore(item, hasVisualAssets),
      visualAssets: { extraction: perfExtraction },
      collectorNotes: performanceNotes(item, hasVisualAssets),
      detectedVenue: detectedVenue(item.performanceLabel, item.filePath),
      detectedYear: item.year ?? null,
      confidence: performanceConfidence(item, hasVisualAssets),
      facts: performanceFacts(item, hasVisualAssets),
    };
  });
}

const AUTO_APPROVE_CATEGORIES = new Set([
  "artist",
  "album",
  "chart",
  "recording",
  "video",
  "performance",
]);

const VDJ_NOISE =
  /virtualdj library play count|owned media file:|retroverse track identity|^\/users\/|\.mp4\b|\.mp3\b/i;

/** Promote obvious facts — target 70–90% approved before Editor. */
export function promoteCollectorFacts(
  facts: CollectorResearchFact[],
): CollectorResearchFact[] {
  const promoted: CollectorResearchFact[] = facts.map((fact) => ({
    ...fact,
    approvalStatus: (shouldAutoApprove(fact) ? "approved" : "pending") as CollectorFactApproval,
  }));

  const targetMin = Math.max(1, Math.ceil(promoted.length * 0.7));
  const targetMax = Math.max(targetMin, Math.floor(promoted.length * 0.9));
  let approvedCount = promoted.filter((f) => f.approvalStatus === "approved").length;

  if (approvedCount < targetMin) {
    const pendingSorted = promoted
      .filter((f) => f.approvalStatus === "pending" && !VDJ_NOISE.test(f.text))
      .sort((a, b) => b.confidence - a.confidence);
    for (const fact of pendingSorted) {
      if (approvedCount >= targetMin) break;
      fact.approvalStatus = "approved";
      approvedCount++;
    }
  }

  if (approvedCount > targetMax) {
    const demotable = promoted
      .filter(
        (f) =>
          f.approvalStatus === "approved" &&
          !f.internalNotes?.includes("locked") &&
          f.source !== "Retroverse Graph",
      )
      .sort((a, b) => a.confidence - b.confidence);
    for (const fact of demotable) {
      if (approvedCount <= targetMax) break;
      fact.approvalStatus = "pending";
      approvedCount--;
    }
  }

  return promoted;
}

function shouldAutoApprove(fact: CollectorResearchFact): boolean {
  if (fact.internalNotes?.includes("locked")) return true;
  if (fact.source === "Retroverse Graph") return true;
  if (fact.confidence >= 0.95) return true;

  const text = fact.text.trim();
  if (VDJ_NOISE.test(text)) return false;
  if (/^retroverse track identity/i.test(text)) return false;

  if (AUTO_APPROVE_CATEGORIES.has(fact.category) && fact.confidence >= 0.8) {
    return true;
  }

  if (/performed by|peaked at|billboard|hot 100|certified|platinum|gold/i.test(text)) {
    return fact.confidence >= 0.75;
  }

  if (/album|studio|produced by|written by|composed by|released in \d{4}/i.test(text)) {
    return fact.confidence >= 0.72;
  }

  if (fact.category === "cultural_impact" && fact.confidence >= 0.78 && text.length >= 50) {
    return true;
  }

  return false;
}

export function computeDomainConfidence(
  pkg: Omit<CollectorPackage, "confidence" | "storySeed">,
  performances: CollectorPerformance[],
  song: CollectorSongArchive,
): CollectorDomainConfidence {
  const identity = scoreIdentity(pkg);
  const recording = scoreRecording(pkg);
  const charts = scoreCharts(pkg);
  const performance = scorePerformance(performances, pkg);
  const culture = scoreCulture(pkg);
  const relationships = scoreRelationships(pkg);

  const overall = Math.round(
    identity * 0.2 +
      recording * 0.15 +
      charts * 0.15 +
      performance * 0.2 +
      culture * 0.15 +
      relationships * 0.15,
  );

  return {
    identity,
    recording,
    charts,
    performance,
    culture,
    relationships,
    overall,
  };
}

function scoreIdentity(pkg: Pick<CollectorPackage, "graphLinked" | "identity">): number {
  let score = 30;
  if (pkg.graphLinked) score += 35;
  if (pkg.identity.year != null) score += 15;
  if (pkg.identity.albumTitle) score += 20;
  return Math.min(100, score);
}

function scoreRecording(pkg: Pick<CollectorPackage, "recording" | "stages">): number {
  let score = 20;
  if (pkg.recording.notes.length >= 2) score += 50;
  else if (pkg.recording.notes.length === 1) score += 30;
  if (pkg.stages?.recording?.status === "complete") score += 20;
  return Math.min(100, score);
}

function scoreCharts(pkg: Pick<CollectorPackage, "charts">): number {
  if (pkg.charts.peakHot100 != null) {
    return pkg.charts.chartWeeks != null ? 95 : 85;
  }
  return 25;
}

function scorePerformance(
  performances: CollectorPerformance[],
  pkg: Pick<CollectorPackage, "videoPerformance">,
): number {
  if (performances.length === 0) return 15;
  let score = 40 + Math.min(30, performances.length * 10);
  const withVisuals = performances.filter((p) => p.visualAssets.extraction.extractedCount > 0);
  if (withVisuals.length > 0) score += 25;
  if ((pkg.videoPerformance?.items.length ?? 0) > 0) score += 10;
  return Math.min(100, score);
}

function scoreCulture(pkg: Pick<CollectorPackage, "culturalContext" | "stages">): number {
  let score = 20;
  score += Math.min(50, pkg.culturalContext.notes.length * 15);
  if (pkg.stages?.cultural_context?.status === "complete") score += 20;
  return Math.min(100, score);
}

function scoreRelationships(pkg: Pick<CollectorPackage, "relationships">): number {
  const count = pkg.relationships.relatedArtists.length;
  if (count >= 3) return 90;
  if (count === 2) return 65;
  if (count === 1) return 40;
  return 20;
}

export function confidenceLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  if (score >= 35) return "Developing";
  return "Early";
}

function suggestStoryAngle(
  pkg: Pick<CollectorPackage, "charts" | "identity" | "performances">,
  performances: CollectorPerformance[],
): string {
  const hasLive = performances.some(
    (p) => /live/i.test(p.title) || /live/i.test(p.virtualDjFilePath ?? ""),
  );
  if (hasLive) return "live_performance";
  if (pkg.charts.peakHot100 != null && pkg.charts.peakHot100 <= 10) return "breakthrough";
  if (pkg.charts.peakHot100 != null) return "cultural_moment";
  if (pkg.identity.year != null && pkg.identity.year < 1980) return "personal_story";
  return "cultural_moment";
}

export function buildStorySeed(
  pkg: Omit<CollectorPackage, "storySeed" | "confidence">,
  approvedFacts: CollectorResearchFact[],
  performances: CollectorPerformance[],
  confidence: CollectorDomainConfidence,
  canonical?: ReturnType<typeof buildCanonicalModel>,
): CollectorStorySeed {
  const approvedTexts = approvedFacts
    .filter((f) => f.approvalStatus === "approved" && !VDJ_NOISE.test(f.text))
    .map((f) => f.text.trim())
    .filter((t) => t.length >= 20);

  const strongestFacts = approvedTexts.slice(0, 3);

  const storyIdeas: string[] = [];
  const songYear = canonical?.song.originalReleaseYear ?? pkg.identity.year;
  const recordingYear = canonical?.yearResolution.recordingRelease.year;
  const perf = performances[0];

  if (pkg.charts.peakHot100 != null) {
    storyIdeas.push(`Chart story — peaked at #${pkg.charts.peakHot100} on the Hot 100`);
  }
  if (songYear != null) {
    storyIdeas.push(`Song release — original ${songYear} chapter`);
  }
  if (recordingYear != null && recordingYear !== songYear) {
    storyIdeas.push(
      `Recording edition — ${canonical?.yearResolution.recordingRelease.label ?? recordingYear}`,
    );
  }
  if (performances.length > 0 && perf) {
    storyIdeas.push(
      `Performance angle — ${perf.title}${perf.detectedVenue ? ` at ${perf.detectedVenue}` : ""}${perf.detectedYear ? ` (${perf.detectedYear})` : ""}`,
    );
  }
  for (const fact of approvedTexts) {
    if (storyIdeas.length >= 4) break;
    if (/record|studio|written|cultural|impact|legend/i.test(fact)) {
      storyIdeas.push(fact.slice(0, 120));
    }
  }

  let whyItMatters = `${pkg.artist}'s "${pkg.title}"`;
  if (pkg.charts.peakHot100 != null) {
    whyItMatters += ` reached #${pkg.charts.peakHot100} on the Billboard Hot 100`;
  } else if (songYear != null) {
    whyItMatters += ` — original release ${songYear}`;
  } else if (perf?.detectedYear != null) {
    whyItMatters += ` — captured in performance footage from ${perf.detectedYear}`;
  } else {
    whyItMatters += ` remains a meaningful entry in the Retroverse library`;
  }
  whyItMatters += ".";

  if (confidence.culture >= 70 && pkg.culturalContext.notes[0]) {
    whyItMatters += ` ${pkg.culturalContext.notes[0].split(/[.!?]/)[0]}.`;
  }

  const suggestedAngle = suggestStoryAngle({ ...pkg, performances }, performances);

  return {
    whyItMatters,
    strongestFacts,
    storyIdeas: storyIdeas.slice(0, 4),
    suggestedAngle,
  };
}

/** Finalize a collected package — write v4 contract fields before save. */
export function finalizeCollectorPackage(
  pkg: CollectorPackage,
  input: FinalizeCollectorInput,
): CollectorPackage {
  const performances = buildPerformances(pkg, input);
  const canonical = buildCanonicalModel(pkg, performances);
  const candidateFacts = scopeResearchFacts(
    promoteCollectorFacts(pkg.candidateFacts),
    canonical,
    performances,
  );
  const song = deriveSongArchive({ ...pkg, candidateFacts });
  const confidence = computeDomainConfidence({ ...pkg, candidateFacts }, performances, song);
  const storySeed = buildStorySeed(
    { ...pkg, candidateFacts },
    candidateFacts,
    performances,
    confidence,
    canonical,
  );

  const primaryPerf = performances.find(
    (p) =>
      input.primaryVideoPath &&
      normPath(p.virtualDjFilePath ?? "") === normPath(input.primaryVideoPath),
  );

  const identityNotes = [
    ...pkg.identityNotes,
    ...(canonical.yearResolution.notes.length > 0
      ? [`Year resolution: ${canonical.yearResolution.notes.join(" ")}`]
      : []),
  ];

  return {
    ...pkg,
    version: 4,
    candidateFacts,
    song,
    performances,
    confidence,
    storySeed,
    songEntity: canonical.song,
    recordings: canonical.recordings,
    performanceEntities: canonical.performances,
    timelines: canonical.timelines,
    yearResolution: canonical.yearResolution,
    canonical,
    identityNotes,
    visualAssets: {
      ...pkg.visualAssets,
      extraction: primaryPerf?.visualAssets.extraction ?? input.primaryExtraction,
    },
    summary: {
      ...pkg.summary,
      researchSummary: [
        pkg.summary.researchSummary,
        `${performances.length} performance(s) · ${candidateFacts.filter((f) => f.approvalStatus === "approved").length}/${candidateFacts.length} facts approved · confidence ${confidence.overall}% · song ${canonical.song.originalReleaseYear ?? "—"} / recording ${canonical.yearResolution.recordingRelease.year ?? "—"}`,
      ].join(" · "),
    },
  };
}

export function approvedFactCount(facts: CollectorResearchFact[]): number {
  return facts.filter((f) => f.approvalStatus === "approved").length;
}

export function approvedFactRatio(facts: CollectorResearchFact[]): number {
  if (facts.length === 0) return 0;
  return approvedFactCount(facts) / facts.length;
}
