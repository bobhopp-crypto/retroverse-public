import { randomUUID } from "crypto";

import type {
  CandidateFact,
  FactCategory,
  ResearchVaultEntry,
  SongPackageMetadata,
} from "./song-package-types";

const CATEGORY_IMPORTANCE: Record<FactCategory, number> = {
  chart: 0.85,
  video: 0.9,
  trivia: 0.88,
  recording: 0.82,
  quote: 0.75,
  album: 0.8,
  artist: 0.6,
  performance: 0.78,
  cultural_impact: 0.72,
  tv_film: 0.7,
};

function fact(
  input: Omit<CandidateFact, "id" | "createdAt" | "reviewStatus" | "extractionMethod"> & {
    extractionMethod?: CandidateFact["extractionMethod"];
    reviewStatus?: CandidateFact["reviewStatus"];
  },
): CandidateFact {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt: now,
    reviewStatus: input.reviewStatus ?? (input.locked ? "approved" : "pending"),
    extractionMethod: input.extractionMethod ?? "deterministic",
    ...input,
  };
}

/** Layer 0 — locked facts from Retroverse graph. Model may not override these. */
export function emitCanonicalFacts(metadata: SongPackageMetadata): CandidateFact[] {
  const facts: CandidateFact[] = [];
  const excerptBase = `Retroverse canonical record for ${metadata.rvtr}`;

  facts.push(
    fact({
      category: "trivia",
      factText: `Retroverse track identity: ${metadata.rvtr}.`,
      sourceType: "canonical",
      sourceId: `meta-rvtr-${metadata.rvtr}`,
      sourceUrl: null,
      sourceExcerpt: excerptBase,
      excerptAnchor: metadata.rvtr,
      confidence: 1,
      importance: 1,
      locked: true,
    }),
  );

  facts.push(
    fact({
      category: "artist",
      factText: `${metadata.title} is performed by ${metadata.artist}.`,
      sourceType: "canonical",
      sourceId: `meta-${metadata.rvtr}`,
      sourceUrl: null,
      sourceExcerpt: excerptBase,
      excerptAnchor: metadata.artist,
      confidence: 1,
      importance: CATEGORY_IMPORTANCE.artist,
      locked: true,
    }),
  );

  if (metadata.albumTitle) {
    facts.push(
      fact({
        category: "album",
        factText: `The song appears on the album "${metadata.albumTitle}"${metadata.year ? ` (${metadata.year})` : ""}.`,
        sourceType: "canonical",
        sourceId: `meta-${metadata.rvtr}`,
        sourceUrl: null,
        sourceExcerpt: excerptBase,
        excerptAnchor: metadata.albumTitle,
        confidence: 1,
        importance: CATEGORY_IMPORTANCE.album,
        locked: true,
      }),
    );
  }

  if (metadata.coverUrl) {
    facts.push(
      fact({
        category: "album",
        factText: `Canonical cover art is assigned in the Retroverse Cover Library for ${metadata.rvtr}.`,
        sourceType: "canonical",
        sourceId: `meta-cover-${metadata.rvtr}`,
        sourceUrl: metadata.coverUrl,
        sourceExcerpt: excerptBase,
        excerptAnchor: "Cover Library",
        confidence: 1,
        importance: 0.9,
        locked: true,
      }),
    );
  }

  if (metadata.peakHot100 != null) {
    const peakText = `Billboard Hot 100 peak: #${metadata.peakHot100}.`;
    facts.push(
      fact({
        category: "chart",
        factText: `The song peaked at #${metadata.peakHot100} on the Billboard Hot 100${metadata.chartWeeks ? ` and spent ${metadata.chartWeeks} weeks on the chart` : ""}.`,
        sourceType: "canonical",
        sourceId: `meta-chart-${metadata.rvtr}`,
        sourceUrl: null,
        sourceExcerpt: `${peakText}${metadata.chartWeeks ? ` ${metadata.chartWeeks} weeks on chart.` : ""}`,
        excerptAnchor: peakText,
        confidence: 1,
        importance: CATEGORY_IMPORTANCE.chart,
        locked: true,
      }),
    );
  }

  if (metadata.playCount != null) {
    facts.push(
      fact({
        category: "trivia",
        factText: `VirtualDJ library play count: ${metadata.playCount}.`,
        sourceType: "canonical",
        sourceId: `meta-vdj-${metadata.rvtr}`,
        sourceUrl: null,
        sourceExcerpt: excerptBase,
        excerptAnchor: String(metadata.playCount),
        confidence: 1,
        importance: 0.65,
        locked: true,
      }),
    );
  }

  if (metadata.videoInfo) {
    facts.push(
      fact({
        category: "video",
        factText: `Owned media file: ${metadata.videoInfo}.`,
        sourceType: "canonical",
        sourceId: `meta-vdj-${metadata.rvtr}`,
        sourceUrl: null,
        sourceExcerpt: metadata.videoInfo,
        excerptAnchor: metadata.videoInfo.slice(0, 40),
        confidence: 1,
        importance: 0.7,
        locked: true,
      }),
    );
  }

  if (metadata.tags.length > 0) {
    facts.push(
      fact({
        category: "trivia",
        factText: `Retroverse Tags: ${metadata.tags.join(", ")}.`,
        sourceType: "canonical",
        sourceId: `meta-tags-${metadata.rvtr}`,
        sourceUrl: null,
        sourceExcerpt: excerptBase,
        excerptAnchor: metadata.tags[0] ?? "Tags",
        confidence: 1,
        importance: 0.85,
        locked: true,
      }),
    );
  }

  if (metadata.relatedArtists?.length) {
    facts.push(
      fact({
        category: "artist",
        factText: `Related artists in Retroverse graph: ${metadata.relatedArtists.join(", ")}.`,
        sourceType: "canonical",
        sourceId: `meta-related-${metadata.rvtr}`,
        sourceUrl: null,
        sourceExcerpt: excerptBase,
        excerptAnchor: metadata.relatedArtists[0]!,
        confidence: 1,
        importance: 0.7,
        locked: true,
      }),
    );
  }

  return facts;
}

/** Deterministic facts from research vault chart entry. */
export function emitVaultChartFacts(
  vault: ResearchVaultEntry[],
  metadata: SongPackageMetadata,
): CandidateFact[] {
  const chartEntry = vault.find((v) => v.id === "retroverse-chart");
  if (!chartEntry) return [];

  return [
    fact({
      category: "chart",
      factText: chartEntry.excerpt.endsWith(".") ? chartEntry.excerpt : `${chartEntry.excerpt}.`,
      sourceType: "research_vault",
      sourceId: chartEntry.id,
      sourceUrl: chartEntry.url || null,
      sourceExcerpt: chartEntry.excerpt,
      excerptAnchor: chartEntry.excerpt.slice(0, 40),
      confidence: Math.min(chartEntry.confidence, 1),
      importance: CATEGORY_IMPORTANCE.chart,
      locked: metadata.peakHot100 != null,
      extractionMethod: "deterministic",
    }),
  ];
}

export { CATEGORY_IMPORTANCE };
