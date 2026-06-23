import { inspectQuery } from "@/lib/inspect/pg";
import { buildArtifactStudioModel } from "./artifact-view-model";
import {
  buildPackageViewModel,
  defaultRelationships,
  type FactGroupKey,
  type PackageRelationships,
} from "./package-view-model";
import { hydratePackageIntel } from "./package-intel";
import { loadSongPackage, normalizePackageRvtr } from "./song-package-store";
import type { CandidateFact, FactCategory, SongPackage } from "./song-package-types";

const GROUP_LABELS: Record<FactGroupKey, string> = {
  Origin: "Origin",
  Recording: "Recording",
  Video: "Video",
  Performance: "Performance",
  Chart: "Chart",
  Artist: "Artist",
  Album: "Album",
  Cultural: "Cultural Impact",
  Quote: "Quote",
};

const CATEGORY_LABELS: Record<FactCategory, string> = {
  trivia: "Origin",
  recording: "Recording",
  video: "Video",
  performance: "Performance",
  chart: "Chart",
  artist: "Artist",
  album: "Album",
  cultural_impact: "Cultural Impact",
  tv_film: "Cultural Impact",
  quote: "Quote",
};

export type SongSheetTopFact = {
  text: string;
  category: string;
  confidence: number;
};

export type SongSheetModel = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  coverUrl: string | null;
  publishedAt: string;
  artifact: ReturnType<typeof buildArtifactStudioModel>;
  topFacts: SongSheetTopFact[];
  relationships: PackageRelationships;
  chartPeak: number | null;
  chartWeeks: number | null;
  label: string | null;
};

function activeFacts(facts: CandidateFact[]): CandidateFact[] {
  return facts.filter((f) => f.reviewStatus === "approved" && !f.mergedIntoId);
}

function selectTopFacts(pkg: SongPackage, limit = 10): SongSheetTopFact[] {
  const approved = activeFacts(pkg.candidateFacts).sort(
    (a, b) => b.importance - a.importance || b.confidence - a.confidence,
  );

  const fromFacts: SongSheetTopFact[] = approved.map((f) => ({
    text: f.factText,
    category: CATEGORY_LABELS[f.category],
    confidence: f.confidence,
  }));

  if (fromFacts.length >= 5) return fromFacts.slice(0, limit);

  const cardFacts = pkg.storyCards
    .filter((c) => c.rank > 0 && !c.hidden)
    .sort((a, b) => b.confidence - a.confidence)
    .map((c) => ({
      text: c.fact,
      category: CATEGORY_LABELS[c.category] ?? "Origin",
      confidence: c.confidence,
    }));

  const seen = new Set(fromFacts.map((f) => f.text.toLowerCase()));
  for (const c of cardFacts) {
    if (fromFacts.length >= limit) break;
    if (seen.has(c.text.toLowerCase())) continue;
    seen.add(c.text.toLowerCase());
    fromFacts.push(c);
  }

  return fromFacts.slice(0, limit);
}

async function loadRelatedSongs(rvtr: string, artist: string) {
  try {
    const rows = await inspectQuery<{
      track_id: string;
      canonical_title: string;
    }>(
      `
      SELECT track_id, canonical_title
      FROM canonical_track_display
      WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i'))
        = lower(regexp_replace(trim($1), '^the\\s+', '', 'i'))
        AND upper(trim(track_id)) <> upper(trim($2))
      ORDER BY peak_hot100_position ASC NULLS LAST, canonical_title ASC
      LIMIT 8
      `,
      [artist, rvtr],
    );
    return rows.map((r) => ({
      rvtr: r.track_id,
      title: r.canonical_title,
    }));
  } catch {
    return [];
  }
}

export async function loadSongSheet(rvtrParam: string): Promise<SongSheetModel | null> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  const raw = await loadSongPackage(rvtr);
  if (!raw) return null;

  const pkg = hydratePackageIntel(raw);
  const relatedSongs = await loadRelatedSongs(rvtr, pkg.metadata.artist);

  const relationships: PackageRelationships = {
    ...defaultRelationships(pkg),
    relatedSongs,
    relatedArtists: [{ name: pkg.metadata.artist }],
  };

  const view = buildPackageViewModel(pkg, relationships);
  const artifact = buildArtifactStudioModel(pkg);

  return {
    rvtr,
    title: pkg.metadata.title,
    artist: pkg.metadata.artist,
    year: pkg.metadata.year,
    coverUrl: pkg.metadata.coverUrl,
    publishedAt: pkg.publishedAt ?? pkg.updatedAt,
    artifact,
    topFacts: selectTopFacts(pkg),
    relationships: {
      ...view.relationships,
      relatedSongs,
    },
    chartPeak: pkg.metadata.peakHot100,
    chartWeeks: pkg.metadata.chartWeeks,
    label: pkg.intel.label,
  };
}

export { GROUP_LABELS };
