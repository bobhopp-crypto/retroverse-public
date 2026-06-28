import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { normalizeRvtr } from "@/lib/studio/status";

import {
  SONG_DNA_VISUAL_LANGUAGE,
  buildDnaOverview,
  buildExecutiveSummary,
  buildSongDnaChapters,
} from "./build-chapters";
import {
  buildAudienceSequence,
  buildPreviewWall,
  buildSongDnaArtDirection,
  buildVisualConcepts,
} from "./build-visual-language";
import { reviewSongDnaExperience } from "./creative-review";
import { extractCollectorHints } from "./enrichment";
import { assessProductionReadiness } from "./production-readiness";
import { buildEnrichmentSlots, buildSongDnaSignals, countAvailableEnrichment } from "./signals";
import type { SongDnaExperience, SongDnaWorkspacePayload } from "./types";

export async function buildSongDnaExperience(rvtrInput: string): Promise<SongDnaExperience | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const [dna, collector, track] = await Promise.all([
    loadSongDnaPackage(rvtr),
    loadCollectorPackage(rvtr),
    loadTrackPage(rvtr),
  ]);
  if (!dna) return null;

  const hints = extractCollectorHints(collector, dna);
  const relatedTracks = track?.relatedTracks ?? [];
  const { chapters, skipped } = buildSongDnaChapters({ dna, hints, relatedTracks });

  const enrichmentSlots = buildEnrichmentSlots();
  const signals = buildSongDnaSignals(dna);
  const visualConcepts = buildVisualConcepts(chapters, dna);
  const artDirection = buildSongDnaArtDirection(dna);
  const audienceSequence = buildAudienceSequence(chapters);
  const previewWall = buildPreviewWall(visualConcepts, dna);

  const review = reviewSongDnaExperience({
    chapters,
    skipped,
    hasVisual: Boolean(dna.visual),
    hasMusical: Boolean(dna.musical),
    signalCount: signals.filter((s) => s.available).length,
  });

  const productionReadiness = assessProductionReadiness({
    dna,
    chapters,
    coverUrl: track?.coverUrl ?? collector?.visualAssets?.coverUrl ?? null,
  });

  return {
    version: 1,
    rvtr,
    artist: dna.artist,
    title: dna.title,
    generatedAt: new Date().toISOString(),
    coverUrl: track?.coverUrl ?? collector?.visualAssets?.coverUrl ?? null,
    songDna: dna,
    visualLanguage: SONG_DNA_VISUAL_LANGUAGE(dna),
    executiveSummary: buildExecutiveSummary(dna),
    overview: buildDnaOverview(dna, signals.length, countAvailableEnrichment(enrichmentSlots)),
    signals,
    enrichmentSlots,
    chapters,
    skippedChapters: skipped,
    visualConcepts,
    artDirection,
    audienceSequence,
    previewWall,
    review,
    productionReadiness,
  };
}

export async function loadSongDnaWorkspace(rvtrInput: string): Promise<SongDnaWorkspacePayload | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const dna = await loadSongDnaPackage(rvtr);
  if (!dna) return { experience: null, hasSongDna: false };

  const experience = await buildSongDnaExperience(rvtr);
  if (!experience) return null;

  return { experience, hasSongDna: true };
}
