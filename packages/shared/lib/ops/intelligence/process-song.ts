import { randomUUID } from "crypto";

import { emitCanonicalFacts, emitVaultChartFacts } from "./canonical-facts";
import { assembleStoryCards, canBuildCards } from "./card-assemble";
import { dedupeCandidateFacts, extractAllCandidateFacts } from "./fact-extract";
import { promoteVerifiedFacts } from "./promote-verified-facts";
import { loadSongMetadata } from "./load-song-metadata";
import { ollamaAvailable } from "./ollama-client";
import { buildCanonResearchCaptures } from "./canon-research-vault";
import {
  captureWikipediaResearch,
} from "./research-capture";
import { autoApproveTopStories, rankCandidateStories } from "./story-rank";
import { proposeCandidateStories } from "./story-propose";
import { buildPackageIntel } from "./package-intel";
import {
  createEmptySongPackage,
  loadSongPackage,
  saveSongPackage,
} from "./song-package-store";
import type {
  CandidateFact,
  CandidateStory,
  PackageIssueFlag,
  ProcessSongResult,
  ResearchVaultEntry,
  SongPackage,
  StoryCard,
} from "./song-package-types";

export type ProcessSongOptions = {
  onStep?: (message: string) => void;
};

function logStep(pkg: SongPackage, message: string, options?: ProcessSongOptions): void {
  pkg.processLog.push(`${new Date().toISOString()} · ${message}`);
  options?.onStep?.(message);
}

async function refreshExperienceCache(
  rvtr: string,
  options?: ProcessSongOptions,
): Promise<void> {
  try {
    const { refreshSongExperienceByRvtr } = await import(
      "@/lib/retroverse/experience/refresh-song-experience"
    );
    const { loadTrackPage } = await import("@/lib/track/load-track-page");
    const { loadSongControlPackage } = await import("@/lib/retroverse-2/song-control");

    await refreshSongExperienceByRvtr(
      rvtr,
      loadTrackPage,
      async (track) => loadSongControlPackage(track),
    );
    options?.onStep?.("Experience exhibit plan refreshed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    options?.onStep?.(`Experience cache refresh skipped: ${message}`);
  }
}

function toResearchVault(
  captures: Array<{
    id: string;
    source: string;
    url: string;
    title: string;
    excerpt: string;
    confidence: number;
  }>,
): ResearchVaultEntry[] {
  const now = new Date().toISOString();
  return captures.map((c) => ({
    id: c.id,
    source: c.source,
    url: c.url,
    capturedAt: now,
    excerpt: c.excerpt,
    confidence: c.confidence,
  }));
}

export async function processSong(rvtrParam: string, options: ProcessSongOptions = {}): Promise<ProcessSongResult> {
  const rvtr = rvtrParam.trim().toUpperCase();
  const emptyMeta = {
    rvtr,
    artist: "",
    title: "",
    year: null,
    albumTitle: null,
    coverUrl: null,
    peakHot100: null,
    chartWeeks: null,
    playCount: null,
    tags: [],
    hasVdjMedia: false,
    videoInfo: null,
    relatedArtists: [],
  };

  if (!/^RVTR\d{6}$/.test(rvtr)) {
    return { ok: false, rvtr, package: createEmptySongPackage(emptyMeta), error: "invalid_rvtr" };
  }

  const metadata = await loadSongMetadata(rvtr);
  if (!metadata) {
    return { ok: false, rvtr, package: createEmptySongPackage(emptyMeta), error: "track_not_found" };
  }

  const existing = await loadSongPackage(rvtr);
  const coverLocked = (existing as { retroverse2?: { locks?: { cover?: boolean } } } | null)
    ?.retroverse2?.locks?.cover === true;
  const mergedMetadata = coverLocked && existing?.metadata.coverUrl
    ? { ...metadata, coverUrl: existing.metadata.coverUrl }
    : metadata;

  const pkg: SongPackage = existing
    ? {
        ...existing,
        metadata: mergedMetadata,
        status: "processing",
        updatedAt: new Date().toISOString(),
        processLog: [],
        storyCards: [],
      }
    : createEmptySongPackage(mergedMetadata);

  pkg.status = "processing";
  pkg.processLog = [];
  logStep(pkg, `Processing ${metadata.title} · ${metadata.artist} (Canon First)`, options);
  await saveSongPackage(pkg);

  try {
    // Canon First — Retroverse assets before external enrichment
    logStep(pkg, "Loading Retroverse canon (graph, cover, chart, VDJ, tags)…", options);
    const canonCaptures = buildCanonResearchCaptures(metadata);
    pkg.researchVault = toResearchVault(canonCaptures);
    logStep(pkg, `Canon vault: ${pkg.researchVault.length} Retroverse sources`, options);
    await saveSongPackage(pkg);

    logStep(pkg, "Capturing external enrichment (Wikipedia)…", options);
    const wikiCaptures = await captureWikipediaResearch({
      artist: metadata.artist,
      title: metadata.title,
      albumTitle: metadata.albumTitle,
    });
    pkg.researchVault = [...pkg.researchVault, ...toResearchVault(wikiCaptures)];
    logStep(pkg, `Research vault: ${pkg.researchVault.length} sources (${wikiCaptures.length} external)`, options);
    await saveSongPackage(pkg);

    // Layer 2: Canonical + candidate facts
    logStep(pkg, "Emitting canonical facts…", options);
    const canonical = emitCanonicalFacts(metadata);
    const vaultChart = metadata.peakHot100 == null ? emitVaultChartFacts(pkg.researchVault, metadata) : [];
    const lockedFacts = dedupeCandidateFacts([...canonical, ...vaultChart]);
    logStep(pkg, `Canonical facts: ${lockedFacts.length}`, options);

    const ollamaOk = await ollamaAvailable();
    if (!ollamaOk) {
      throw new Error("Ollama not available at localhost:11434 — start with: ollama serve");
    }

    logStep(pkg, "Extracting candidate facts from research…", options);
    pkg.candidateFacts = await extractAllCandidateFacts({
      metadata,
      researchVault: pkg.researchVault,
      canonicalFacts: lockedFacts,
    });
    pkg.candidateFacts = promoteVerifiedFacts(pkg.candidateFacts);
    logStep(pkg, `Candidate facts: ${pkg.candidateFacts.length} (${pkg.candidateFacts.filter((f) => f.reviewStatus === "approved").length} approved)`, options);
    await saveSongPackage(pkg);

    // Layer 3: Candidate stories
    logStep(pkg, "Proposing candidate stories…", options);
    pkg.candidateStories = proposeCandidateStories(pkg.candidateFacts, metadata);
    logStep(pkg, `Candidate stories: ${pkg.candidateStories.length}`, options);

    // Layer 4: Ranking
    logStep(pkg, "Ranking stories…", options);
    const factsById = new Map(pkg.candidateFacts.map((f) => [f.id, f]));
    pkg.candidateStories = rankCandidateStories(pkg.candidateStories, factsById);
    pkg.candidateStories = autoApproveTopStories(pkg.candidateStories, 8);
    logStep(pkg, `Top story: "${pkg.candidateStories[0]?.headline ?? "(none)"}"`, options);
    await saveSongPackage(pkg);

    pkg.status = "review";
    pkg.processedAt = new Date().toISOString();
    pkg.intel = buildPackageIntel(pkg);
    logStep(pkg, `Package intel: ${pkg.intel.timelineEvents.length} timeline events`, options);
    logStep(pkg, "Ready for human review — build cards after approving facts/stories", options);
    const saved = await saveSongPackage(pkg);
    await refreshExperienceCache(saved.rvtr, options);
    return { ok: true, rvtr, package: saved };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep(pkg, `ERROR: ${message}`, options);
    pkg.status = "draft";
    await saveSongPackage(pkg);
    return { ok: false, rvtr, package: pkg, error: message };
  }
}

export async function buildCardsFromReview(rvtrParam: string): Promise<{
  ok: boolean;
  package: SongPackage | null;
  error?: string;
}> {
  const pkg = await loadSongPackage(rvtrParam);
  if (!pkg) return { ok: false, package: null, error: "package_not_found" };

  const check = canBuildCards(pkg.candidateStories, pkg.candidateFacts);
  if (!check.ok) return { ok: false, package: pkg, error: check.reason };

  const factsById = new Map(pkg.candidateFacts.map((f) => [f.id, f]));
  pkg.storyCards = assembleStoryCards({
    metadata: pkg.metadata,
    stories: pkg.candidateStories,
    factsById,
  });
  pkg.intel = buildPackageIntel(pkg);
  pkg.status = "cards_ready";
  logStep(pkg, `Story cards assembled: ${pkg.storyCards.length}`);
  const saved = await saveSongPackage(pkg);
  await refreshExperienceCache(saved.rvtr);
  return { ok: true, package: saved };
}

export async function approveSongPackage(rvtrParam: string): Promise<SongPackage | null> {
  const pkg = await loadSongPackage(rvtrParam);
  if (!pkg) return null;
  const now = new Date().toISOString();
  return saveSongPackage({ ...pkg, status: "approved", approvedAt: now });
}

export async function patchSongPackage(
  rvtrParam: string,
  patch: Partial<{
    candidateFacts: CandidateFact[];
    candidateStories: CandidateStory[];
    storyCards: StoryCard[];
    issueFlags: PackageIssueFlag[];
  }>,
): Promise<SongPackage | null> {
  const pkg = await loadSongPackage(rvtrParam);
  if (!pkg) return null;

  let next: SongPackage = {
    ...pkg,
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    updatedAt: new Date().toISOString(),
  };

  if (patch.candidateStories) {
    const factsById = new Map(next.candidateFacts.map((f) => [f.id, f]));
    next = {
      ...next,
      candidateStories: rankCandidateStories(patch.candidateStories, factsById),
    };
  }

  if (next.status === "approved" && patch.candidateFacts) {
    next.status = "review";
  }

  return saveSongPackage(next);
}
