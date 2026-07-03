import "server-only";

import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { buildArtDirectionProfile } from "@/lib/retroverse/art-direction/build-art-direction-profile";
import { loadExperienceRenderSpec } from "@/lib/retroverse/renderer/load-render-spec";
import { visualLibraryPath } from "@/lib/studio/package";
import { normalizeRvtr } from "@/lib/studio/status";

import { buildAssetBudget } from "./budget";
import { classifyCoverage, shotTypeFromCategory, subjectsFromCategory, type CoverageContext } from "./coverage";
import { findDuplicateSuggestions } from "./duplicates";
import {
  buildRecommendedDerivedAssets,
  buildVisualRecommendations,
  resolvePublicationId,
} from "./recommendations";
import { resolveVisualLibraryTier } from "./tier";
import type { VisualLibrary, LibraryDerivedAsset, LibraryPerformanceFrame } from "./types";
import { VISUAL_LIBRARY_VERSION } from "./types";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function qualityFromExtraction(category: string | null, sharpnessHint?: number): number {
  const base: Record<string, number> = {
    Hero: 95,
    Performance: 88,
    "Close-up": 92,
    Alternate: 80,
    Crowd: 75,
  };
  const b = base[category ?? ""] ?? 70;
  if (typeof sharpnessHint === "number") {
    return Math.min(100, Math.round(b * 0.6 + Math.min(sharpnessHint, 100) * 0.4));
  }
  return b;
}

function buildPerformanceFrames(input: {
  rvtr: string;
  collector: Awaited<ReturnType<typeof loadCollectorPackage>>;
  editor: Awaited<ReturnType<typeof loadEditorStory>>;
  songDna: Awaited<ReturnType<typeof loadSongDnaPackage>>;
}): LibraryPerformanceFrame[] {
  const { rvtr, collector, editor, songDna } = input;
  const palette =
    songDna?.visual?.dominantPalette ??
    (songDna?.visual?.primaryColor ? [songDna.visual.primaryColor] : []);

  const approvedIds = new Set(
    (editor?.approved.images ?? []).map((i) => i.assetId),
  );

  const frames: LibraryPerformanceFrame[] = [];
  const seen = new Set<string>();

  const perfId = editor?.approved.performanceId ?? collector?.performances?.[0]?.id ?? null;

  for (const perf of collector?.performances ?? []) {
    for (const asset of perf.visualAssets.extraction.assets) {
      if (seen.has(asset.id)) continue;
      seen.add(asset.id);

      frames.push({
        id: asset.id,
        filename: asset.filename,
        imageUrl: `/api/ops/studio/collector/visual-asset?rvtr=${rvtr}&file=${asset.filename}`,
        timestampSec: asset.timestampSec,
        qualityScore: qualityFromExtraction(asset.category, asset.width > 0 ? 85 : undefined),
        detectedSubjects: subjectsFromCategory(asset.category),
        dominantColors: palette.slice(0, 5),
        shotType: shotTypeFromCategory(asset.category),
        performanceId: perf.id,
        category: asset.category,
        approved: approvedIds.has(asset.id),
      });
    }
  }

  if (frames.length === 0 && editor?.workspace.imageBoard) {
    for (const img of editor.workspace.imageBoard) {
      const filename = img.imageUrl.split("file=")[1]?.split("&")[0] ?? "";
      if (!filename || seen.has(img.assetId)) continue;
      seen.add(img.assetId);
      frames.push({
        id: img.assetId,
        filename,
        imageUrl: img.imageUrl,
        timestampSec: null,
        qualityScore: qualityFromExtraction(img.label),
        detectedSubjects: subjectsFromCategory(img.label),
        dominantColors: palette.slice(0, 5),
        shotType: shotTypeFromCategory(img.label),
        performanceId: img.performanceId,
        category: img.label,
        approved: img.approved,
      });
    }
  }

  return frames;
}

function mergeDerivedAssets(
  persisted: LibraryDerivedAsset[] | undefined,
  recommended: LibraryDerivedAsset[],
): LibraryDerivedAsset[] {
  const map = new Map<string, LibraryDerivedAsset>();
  for (const d of recommended) map.set(d.id, d);
  for (const d of persisted ?? []) {
    const existing = map.get(d.id);
    map.set(d.id, existing ? { ...existing, status: d.status, storagePath: d.storagePath ?? existing.storagePath } : d);
  }
  return [...map.values()];
}

function buildCoverageContext(input: {
  collector: Awaited<ReturnType<typeof loadCollectorPackage>>;
  editor: Awaited<ReturnType<typeof loadEditorStory>>;
  songDna: Awaited<ReturnType<typeof loadSongDnaPackage>>;
  experience: Awaited<ReturnType<typeof loadExperienceRenderSpec>>;
}): CoverageContext {
  const { collector, editor, songDna, experience } = input;
  const timelineEvents = experience?.scenes.flatMap((s) => s.assets.timelineEvents ?? []) ?? [];

  return {
    hasChartData: collector?.charts.peakHot100 != null,
    hasAlbumData: Boolean(collector?.identity.albumTitle ?? collector?.charts.albumTitle),
    hasArtistData: Boolean(collector?.artist),
    hasQuoteContent: (editor?.approved.quotes.length ?? 0) > 0,
    hasTimelineEvents: timelineEvents.length > 0,
    isTelevisionSong:
      songDna?.visual?.lightingStyle === "television" ||
      /television|broadcast/i.test(songDna?.experience.overallMood ?? ""),
    hasRecordingNotes: (collector?.recording.notes.length ?? 0) > 0,
  };
}

/** Build Visual Library from existing package data — read-only over pipeline artifacts. */
export async function buildVisualLibrary(rvtr: string): Promise<VisualLibrary | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  const [collector, editor, songDna, experience, persisted] = await Promise.all([
    loadCollectorPackage(normalized),
    loadEditorStory(normalized),
    loadSongDnaPackage(normalized),
    loadExperienceRenderSpec(normalized),
    loadVisualLibrary(normalized),
  ]);

  if (!collector && !experience) return null;

  const tier = resolveVisualLibraryTier({
    collector,
    editor,
    persistedTier: persisted?.tier ?? null,
  });

  const performanceFrames = buildPerformanceFrames({
    rvtr: normalized,
    collector,
    editor,
    songDna,
  });

  const publicationId = resolvePublicationId(songDna);
  const artDirection =
    experience && songDna
      ? buildArtDirectionProfile({
          songDna,
          experience,
          layoutId: "performance",
          rvtr: normalized,
        })
      : null;

  const coverageContext = buildCoverageContext({ collector, editor, songDna, experience });

  const duplicateSuggestions = findDuplicateSuggestions(performanceFrames);

  const preliminaryDerived = mergeDerivedAssets(persisted?.derivedAssets, []);

  const preliminaryCoverage = classifyCoverage({
    frames: performanceFrames,
    derivedAssets: preliminaryDerived,
    context: coverageContext,
  });

  const preliminaryBudget = buildAssetBudget(tier, preliminaryDerived);

  const recommendations = buildVisualRecommendations({
    coverage: preliminaryCoverage,
    frames: performanceFrames,
    derivedAssets: preliminaryDerived,
    duplicates: duplicateSuggestions,
    budget: preliminaryBudget,
    songDna,
    artDirection,
    publicationId,
    songTitle: experience?.spec.metadata.title ?? collector?.title ?? "",
    artist: experience?.spec.metadata.artist ?? collector?.artist ?? "",
  });

  const derivedAssets = buildRecommendedDerivedAssets({
    recommendations,
    frames: performanceFrames,
    songDna,
    artDirection,
    publicationId,
    songTitle: experience?.spec.metadata.title ?? collector?.title ?? "",
    artist: experience?.spec.metadata.artist ?? collector?.artist ?? "",
    rvtr: normalized,
    existingDerived: mergeDerivedAssets(persisted?.derivedAssets, []),
  });

  const coverage = classifyCoverage({
    frames: performanceFrames,
    derivedAssets,
    context: coverageContext,
  });

  const budget = buildAssetBudget(tier, derivedAssets);

  return {
    version: VISUAL_LIBRARY_VERSION,
    rvtr: normalized,
    tier,
    generatedAt: new Date().toISOString(),
    performanceFrames,
    derivedAssets,
    coverage,
    duplicateSuggestions,
    budget,
    recommendations,
    generationQueue: persisted?.generationQueue ?? [],
  };
}

export async function loadVisualLibrary(rvtr: string): Promise<VisualLibrary | null> {
  return readJson<VisualLibrary>(visualLibraryPath(rvtr));
}

export async function saveVisualLibrary(library: VisualLibrary): Promise<void> {
  const path = visualLibraryPath(library.rvtr);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(library, null, 2)}\n`, "utf8");
}

/** Build and optionally persist visual-library.json (operator/research tooling only). */
export async function buildAndSaveVisualLibrary(rvtr: string): Promise<VisualLibrary | null> {
  const library = await buildVisualLibrary(rvtr);
  if (!library) return null;
  await saveVisualLibrary(library);
  return library;
}
