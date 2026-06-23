import { randomUUID } from "crypto";

import { assembleStoryCards, canBuildCards } from "./card-assemble";
import { buildPackageIntel } from "./package-intel";
import { countApprovedFacts, promoteVerifiedFacts } from "./promote-verified-facts";
import { processSong } from "./process-song";
import { loadSongPackage, saveSongPackage } from "./song-package-store";
import type { CandidateFact, ProcessSongResult, SongPackage } from "./song-package-types";

export type ProductionPipelineResult = ProcessSongResult & {
  published: boolean;
  cardsBuilt: number;
  approvedFacts: number;
  publishBlocked?: boolean;
};

export type ProductionPipelineOptions = {
  force?: boolean;
  onStep?: (message: string) => void;
};

function logStep(pkg: SongPackage, message: string, options?: ProductionPipelineOptions): void {
  pkg.processLog.push(`${new Date().toISOString()} · ${message}`);
  options?.onStep?.(message);
}

function backfillFactsFromStoryCards(pkg: SongPackage): CandidateFact[] {
  if (pkg.candidateFacts.length > 0) return pkg.candidateFacts;
  const now = pkg.processedAt ?? pkg.updatedAt;
  return pkg.storyCards
    .filter((c) => c.rank > 0)
    .map((c) => ({
      id: randomUUID(),
      category: c.category,
      factText: c.fact,
      sourceType: "research_vault" as const,
      sourceId: c.storyId,
      sourceUrl: c.sourceUrl,
      sourceExcerpt: c.sourceExcerpt,
      excerptAnchor: c.fact.slice(0, 40),
      confidence: c.confidence,
      importance: c.confidence,
      locked: false,
      extractionMethod: "deterministic" as const,
      reviewStatus: "approved" as const,
      createdAt: now,
    }));
}

async function finalizeAndPublish(
  pkg: SongPackage,
  options: ProductionPipelineOptions = {},
): Promise<ProductionPipelineResult> {
  const rvtr = pkg.rvtr;
  const { assertIntelligenceNotBlocked } = await import("./intelligence-cover-hold");
  await assertIntelligenceNotBlocked(`Publish package (${rvtr})`);

  if (pkg.candidateFacts.length === 0 && pkg.storyCards.length > 0) {
    pkg.candidateFacts = backfillFactsFromStoryCards(pkg);
    logStep(pkg, `Backfilled ${pkg.candidateFacts.length} facts from story cards`, options);
  }

  pkg.candidateFacts = promoteVerifiedFacts(pkg.candidateFacts);
  logStep(pkg, `Promoted verified facts: ${countApprovedFacts(pkg.candidateFacts)} approved`, options);

  if (pkg.storyCards.length === 0) {
    const check = canBuildCards(pkg.candidateStories, pkg.candidateFacts);
    if (!check.ok) {
      pkg.status = "review";
      await saveSongPackage(pkg);
      return {
        ok: false,
        rvtr,
        package: pkg,
        error: check.reason ?? "cannot_build_cards",
        published: false,
        cardsBuilt: 0,
        approvedFacts: countApprovedFacts(pkg.candidateFacts),
      };
    }

    const factsById = new Map(pkg.candidateFacts.map((f) => [f.id, f]));
    pkg.storyCards = assembleStoryCards({
      metadata: pkg.metadata,
      stories: pkg.candidateStories,
      factsById,
    });
    pkg.status = "cards_ready";
    logStep(pkg, `Story cards assembled: ${pkg.storyCards.length}`, options);
  }

  pkg.intel = buildPackageIntel(pkg);
  const now = new Date().toISOString();
  pkg = {
    ...pkg,
    status: "published",
    approvedAt: pkg.approvedAt ?? now,
    publishedAt: now,
  };
  logStep(pkg, "Song sheet published", options);
  const saved = await saveSongPackage(pkg);

  return {
    ok: true,
    rvtr,
    package: saved,
    published: true,
    cardsBuilt: saved.storyCards.length,
    approvedFacts: countApprovedFacts(saved.candidateFacts),
  };
}

async function returnReviewPackage(
  pkg: SongPackage,
  error: string,
  options: ProductionPipelineOptions = {},
): Promise<ProductionPipelineResult> {
  logStep(pkg, `Publish blocked; package remains in ${pkg.status} review state`, options);
  const saved = await saveSongPackage(pkg);
  return {
    ok: true,
    rvtr: saved.rvtr,
    package: saved,
    error,
    published: false,
    publishBlocked: true,
    cardsBuilt: saved.storyCards.length,
    approvedFacts: countApprovedFacts(saved.candidateFacts),
  };
}

async function finalizeOrReturnReview(
  pkg: SongPackage,
  options: ProductionPipelineOptions = {},
): Promise<ProductionPipelineResult> {
  try {
    return await finalizeAndPublish(pkg, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("blocked:")) {
      return returnReviewPackage(pkg, message, options);
    }
    throw err;
  }
}

/** Full automated pipeline: research → facts → stories → cards → publish. */
export async function runProductionPipeline(
  rvtrParam: string,
  options: ProductionPipelineOptions = {},
): Promise<ProductionPipelineResult> {
  const rvtr = rvtrParam.trim().toUpperCase();
  const existing = await loadSongPackage(rvtr);

  const needsFullProcess =
    options.force ||
    !existing ||
    existing.researchVault.length === 0 ||
    (existing.storyCards.length === 0 && existing.candidateStories.length === 0);

  if (!needsFullProcess && existing) {
    logStep(existing, "Fast publish — reusing existing package data", options);
    return finalizeOrReturnReview(existing, options);
  }

  const result = await processSong(rvtr, { onStep: options.onStep });
  if (!result.ok) {
    return {
      ...result,
      published: false,
      cardsBuilt: 0,
      approvedFacts: countApprovedFacts(result.package.candidateFacts),
    };
  }

  return finalizeOrReturnReview(result.package, options);
}

/** Always runs research + extraction — no fast-publish shortcut. */
export async function runForcedProductionPipeline(
  rvtrParam: string,
  options: ProductionPipelineOptions = {},
): Promise<ProductionPipelineResult> {
  const rvtr = rvtrParam.trim().toUpperCase();
  const result = await processSong(rvtr, { onStep: options.onStep });
  if (!result.ok) {
    return {
      ...result,
      published: false,
      cardsBuilt: 0,
      approvedFacts: countApprovedFacts(result.package.candidateFacts),
    };
  }
  return finalizeOrReturnReview(result.package, options);
}

export async function isSongSheetPublished(rvtrParam: string): Promise<boolean> {
  const pkg = await loadSongPackage(rvtrParam);
  return pkg?.status === "published" && (pkg.storyCards.length > 0 || pkg.candidateFacts.length > 0);
}
