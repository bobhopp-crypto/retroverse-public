#!/usr/bin/env npx tsx
/**
 * Package Quality Audit — read-only analysis of existing Song Packages.
 *
 * Usage:
 *   npx tsx tools/intelligence/package-quality-audit.ts
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildPackageViewModel,
  defaultRelationships,
} from "../../lib/ops/intelligence/package-view-model.ts";
import {
  loadSongPackage,
  loadSongPackageIndex,
} from "../../lib/ops/intelligence/song-package-store.ts";
import type {
  CandidateFact,
  CandidateStory,
  ResearchVaultEntry,
  SongPackage,
  StoryCard,
} from "../../lib/ops/intelligence/song-package-types.ts";

const OUT_DIR = join(process.cwd(), "reports", "intelligence");
const MD_PATH = join(OUT_DIR, "package-quality-audit.md");
const JSON_PATH = join(OUT_DIR, "package-quality-audit.json");
const REFERENCE_RVTR = "RVTR974150";

type AlbumAudit = {
  rvtr: string;
  artist: string;
  title: string;
  albumDetected: string | null;
  albumConfidence: number;
  resolutionIssues: string[];
  referencedAlbums: string[];
};

type StoryAudit = {
  rvtr: string;
  artist: string;
  title: string;
  storyCount: number;
  duplicateCount: number;
  repeatedSourceFactCount: number;
  titleOnlyDuplicateCount: number;
  lowInformationCount: number;
  examples: string[];
};

type WeakFact = {
  id: string;
  category: string;
  factText: string;
  reason: string;
  sourceId: string;
};

type FactAudit = {
  rvtr: string;
  artist: string;
  title: string;
  factCount: number;
  weakFactCount: number;
  weakFacts: WeakFact[];
};

type SourceAudit = {
  rvtr: string;
  artist: string;
  title: string;
  sourceCount: number;
  canonicalSourceCount: number;
  wikipediaSourceCount: number;
  secondarySourceCount: number;
  wikipediaShare: number;
  issues: string[];
};

type PackageScore = {
  rvtr: string;
  artist: string;
  title: string;
  status: string;
  score: number;
  categoryScores: {
    albumQuality: number;
    factRelevance: number;
    storyDiversity: number;
    sourceCoverage: number;
    relationshipCompleteness: number;
  };
  issues: string[];
};

type PackageQualityRecord = {
  rvtr: string;
  artist: string;
  title: string;
  status: string;
  album: AlbumAudit;
  stories: StoryAudit;
  facts: FactAudit;
  sources: SourceAudit;
  score: PackageScore;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[''`"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function activeFacts(pkg: SongPackage): CandidateFact[] {
  return pkg.candidateFacts.filter((f) => f.reviewStatus !== "rejected" && !f.mergedIntoId);
}

function activeStories(pkg: SongPackage): CandidateStory[] {
  return pkg.candidateStories.filter((s) => s.reviewStatus !== "rejected");
}

function activeCards(pkg: SongPackage): StoryCard[] {
  return pkg.storyCards.filter((c) => c.rank > 0);
}

function sourceName(source: ResearchVaultEntry): string {
  return source.source || (source.id.startsWith("wiki") ? "Wikipedia" : "Research");
}

function isWikipedia(source: ResearchVaultEntry): boolean {
  return sourceName(source).toLowerCase().includes("wikipedia") || source.url.includes("wikipedia.org");
}

function isCanonical(source: ResearchVaultEntry): boolean {
  return source.id.startsWith("retroverse-") || sourceName(source).toLowerCase().includes("retroverse");
}

function extractAlbumTitlesFromText(text: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\balbum[,:\s]+["“]?([A-Z0-9][^"”.,;\n]{2,80})["”]?/g,
    /\bon (?:their|his|her|the|a|an)?\s*(?:\d{4}\s*)?album[,:\s]+["“]?([A-Z0-9][^"”.,;\n]{2,80})["”]?/g,
    /\breleased (?:on|from) ["“]?([A-Z0-9][^"”.,;\n]{2,80})["”]?/g,
    /\bfrom (?:the )?(?:album|LP) ["“]?([A-Z0-9][^"”.,;\n]{2,80})["”]?/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = compact(match[1] ?? "")
        .replace(/\s+\(.*$/, "")
        .replace(/\s+(which|that|and|with)\b.*$/i, "")
        .replace(/\s+on\s+[A-Z].*$/i, "");
      if (raw.length >= 3 && raw.length <= 80) out.push(raw);
    }
  }
  return uniq(out);
}

function albumAudit(pkg: SongPackage): AlbumAudit {
  const relationship = defaultRelationships(pkg);
  const facts = activeFacts(pkg);
  const storyTexts = [
    ...activeStories(pkg).map((s) => s.headline),
    ...activeCards(pkg).flatMap((c) => [c.headline, c.fact, c.supportingContext ?? ""]),
  ];
  const referencedAlbums = uniq([
    ...facts.flatMap((f) => extractAlbumTitlesFromText(f.factText)),
    ...storyTexts.flatMap(extractAlbumTitlesFromText),
  ]).filter((album) => normalizeText(album) !== normalizeText(pkg.metadata.title));

  const issues: string[] = [];
  if (!pkg.metadata.albumTitle) issues.push("metadata_albumTitle_null");
  if (!relationship.album) issues.push("relationship_unknown_album");
  if (referencedAlbums.length > 1) issues.push("multiple_albums_referenced");
  if (
    pkg.metadata.albumTitle &&
    referencedAlbums.length > 0 &&
    referencedAlbums.every((album) => normalizeText(album) !== normalizeText(pkg.metadata.albumTitle!))
  ) {
    issues.push("conflicting_album_sources");
  }

  const albumDetected = pkg.metadata.albumTitle ?? referencedAlbums[0] ?? null;
  let albumConfidence = 0;
  if (pkg.metadata.albumTitle) albumConfidence = 95;
  else if (referencedAlbums.length === 1) albumConfidence = 55;
  else if (referencedAlbums.length > 1) albumConfidence = 35;

  return {
    rvtr: pkg.rvtr,
    artist: pkg.metadata.artist,
    title: pkg.metadata.title,
    albumDetected,
    albumConfidence,
    resolutionIssues: issues,
    referencedAlbums,
  };
}

function storyAudit(pkg: SongPackage): StoryAudit {
  const stories = activeStories(pkg);
  const factsById = new Map(activeFacts(pkg).map((f) => [f.id, f]));
  const headlineCounts = new Map<string, number>();
  const supportingFactCounts = new Map<string, number>();
  const factSetToHeadlines = new Map<string, string[]>();
  const examples: string[] = [];
  let lowInformationCount = 0;

  for (const story of stories) {
    const headlineKey = normalizeText(story.headline);
    headlineCounts.set(headlineKey, (headlineCounts.get(headlineKey) ?? 0) + 1);

    const factIds = [story.primaryFactId, ...story.supportingFactIds].filter(Boolean);
    for (const id of factIds) {
      supportingFactCounts.set(id, (supportingFactCounts.get(id) ?? 0) + 1);
    }
    const factKey = [...new Set(factIds)].sort().join("|");
    if (factKey) factSetToHeadlines.set(factKey, [...(factSetToHeadlines.get(factKey) ?? []), story.headline]);

    const primaryFact = factsById.get(story.primaryFactId);
    if (
      story.headline.length < 18 ||
      story.supportingFactIds.length === 0 ||
      !primaryFact ||
      normalizeText(story.headline).includes("where did that name come from")
    ) {
      lowInformationCount += 1;
      if (examples.length < 5) examples.push(`${story.headline} — ${primaryFact?.factText ?? "no primary fact"}`);
    }
  }

  const duplicateCount = [...headlineCounts.values()].filter((count) => count > 1).reduce((n, count) => n + count - 1, 0);
  const repeatedSourceFactCount = [...supportingFactCounts.values()]
    .filter((count) => count > 1)
    .reduce((n, count) => n + count - 1, 0);
  const titleOnlyDuplicateCount = [...factSetToHeadlines.values()].filter(
    (headlines) => new Set(headlines.map(normalizeText)).size > 1,
  ).length;

  for (const headlines of factSetToHeadlines.values()) {
    if (headlines.length > 1 && examples.length < 8) {
      examples.push(`Same fact set: ${headlines.join(" / ")}`);
    }
  }

  return {
    rvtr: pkg.rvtr,
    artist: pkg.metadata.artist,
    title: pkg.metadata.title,
    storyCount: stories.length || activeCards(pkg).length,
    duplicateCount,
    repeatedSourceFactCount,
    titleOnlyDuplicateCount,
    lowInformationCount,
    examples,
  };
}

function weakFactReason(pkg: SongPackage, fact: CandidateFact): string | null {
  const text = fact.factText;
  const norm = normalizeText(text);
  const titleNorm = normalizeText(pkg.metadata.title);
  const albumNorm = normalizeText(pkg.metadata.albumTitle ?? "");
  const artistNorm = normalizeText(pkg.metadata.artist);
  const songSpecific =
    norm.includes(titleNorm) ||
    (albumNorm.length > 0 && norm.includes(albumNorm)) ||
    fact.category === "chart" ||
    fact.category === "recording" ||
    fact.category === "video" ||
    fact.category === "performance";

  if (fact.locked) return null;
  if (/\b(parent|father|mother|sister|brother|born|raised|childhood|high school|university|army|immigrant|neighborhood)\b/i.test(text)) {
    return "artist_biography_or_family_trivia";
  }
  if (fact.category === "artist" && !songSpecific) return "artist_biography_only";
  if (!songSpecific && norm.includes(artistNorm)) return "not_song_specific";
  if (/\bhas sold|awarded|inducted|lifetime achievement|net worth|married|children\b/i.test(text) && !songSpecific) {
    return "generic_biography";
  }
  if (fact.category === "trivia" && !songSpecific) return "generic_trivia_not_song_specific";
  if (fact.category === "cultural_impact" && !songSpecific) return "not_culturally_relevant_to_song";
  return null;
}

function factAudit(pkg: SongPackage): FactAudit {
  const weakFacts = activeFacts(pkg)
    .map((fact): WeakFact | null => {
      const reason = weakFactReason(pkg, fact);
      if (!reason) return null;
      return {
        id: fact.id,
        category: fact.category,
        factText: fact.factText,
        reason,
        sourceId: fact.sourceId,
      };
    })
    .filter((fact): fact is WeakFact => fact != null);

  return {
    rvtr: pkg.rvtr,
    artist: pkg.metadata.artist,
    title: pkg.metadata.title,
    factCount: activeFacts(pkg).length,
    weakFactCount: weakFacts.length,
    weakFacts,
  };
}

function sourceAudit(pkg: SongPackage): SourceAudit {
  const sourceCount = pkg.researchVault.length;
  const wikipediaSourceCount = pkg.researchVault.filter(isWikipedia).length;
  const canonicalSourceCount = pkg.researchVault.filter(isCanonical).length;
  const secondarySourceCount = sourceCount - wikipediaSourceCount - canonicalSourceCount;
  const wikipediaShare = sourceCount > 0 ? Math.round((wikipediaSourceCount / sourceCount) * 100) : 0;
  const issues: string[] = [];

  if (sourceCount < 4) issues.push("low_source_count");
  if (wikipediaShare >= 70) issues.push("wikipedia_dominant");
  if (canonicalSourceCount === 0) issues.push("missing_canonical_enrichment");
  if (secondarySourceCount === 0) issues.push("missing_secondary_sources");
  if (pkg.researchVault.length === 1 && canonicalSourceCount === 1) issues.push("canonical_only");

  return {
    rvtr: pkg.rvtr,
    artist: pkg.metadata.artist,
    title: pkg.metadata.title,
    sourceCount,
    canonicalSourceCount,
    wikipediaSourceCount,
    secondarySourceCount,
    wikipediaShare,
    issues,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scorePackage(pkg: SongPackage, album: AlbumAudit, stories: StoryAudit, facts: FactAudit, sources: SourceAudit): PackageScore {
  const view = buildPackageViewModel(pkg, defaultRelationships(pkg));
  const relationshipCompleteness = clampScore(
    (pkg.metadata.albumTitle ? 25 : 0) +
      (pkg.metadata.coverUrl ? 20 : 0) +
      (pkg.metadata.hasVdjMedia ? 20 : 0) +
      (pkg.metadata.peakHot100 != null ? 20 : 0) +
      (pkg.metadata.relatedArtists.length > 0 ? 15 : 0),
  );
  const albumQuality = clampScore(album.albumConfidence - Math.max(0, album.referencedAlbums.length - 1) * 15);
  const factRelevance = clampScore(100 - (facts.factCount > 0 ? (facts.weakFactCount / facts.factCount) * 100 : 80));
  const storyDiversity = clampScore(
    100 -
      stories.duplicateCount * 20 -
      stories.titleOnlyDuplicateCount * 15 -
      stories.lowInformationCount * 10 -
      Math.min(35, stories.repeatedSourceFactCount * 4),
  );
  const sourceCoverage = clampScore(
    Math.min(100, sources.sourceCount * 18) -
      (sources.wikipediaShare >= 70 ? 20 : 0) -
      (sources.secondarySourceCount === 0 ? 20 : 0) -
      (sources.canonicalSourceCount === 0 ? 20 : 0),
  );

  const score = clampScore(
    albumQuality * 0.2 +
      factRelevance * 0.25 +
      storyDiversity * 0.2 +
      sourceCoverage * 0.2 +
      relationshipCompleteness * 0.15,
  );
  const issues = [
    ...album.resolutionIssues,
    ...sources.issues,
    ...(facts.weakFactCount > 0 ? [`weak_facts_${facts.weakFactCount}`] : []),
    ...(stories.duplicateCount > 0 ? [`duplicate_stories_${stories.duplicateCount}`] : []),
    ...(stories.repeatedSourceFactCount > 0 ? [`repeated_story_facts_${stories.repeatedSourceFactCount}`] : []),
    ...(view.relationships.album ? [] : ["unknown_album_relationship"]),
  ];

  return {
    rvtr: pkg.rvtr,
    artist: pkg.metadata.artist,
    title: pkg.metadata.title,
    status: pkg.status,
    score,
    categoryScores: {
      albumQuality,
      factRelevance,
      storyDiversity,
      sourceCoverage,
      relationshipCompleteness,
    },
    issues: uniq(issues),
  };
}

function auditPackage(pkg: SongPackage): PackageQualityRecord {
  const album = albumAudit(pkg);
  const stories = storyAudit(pkg);
  const facts = factAudit(pkg);
  const sources = sourceAudit(pkg);
  const score = scorePackage(pkg, album, stories, facts, sources);
  return {
    rvtr: pkg.rvtr,
    artist: pkg.metadata.artist,
    title: pkg.metadata.title,
    status: pkg.status,
    album,
    stories,
    facts,
    sources,
    score,
  };
}

function mdTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const [head, ...body] = rows;
  return [
    `| ${head!.join(" | ")} |`,
    `| ${head!.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`),
  ].join("\n");
}

function truncate(text: string, max = 140): string {
  const value = compact(text);
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

function buildMarkdown(records: PackageQualityRecord[]): string {
  const generatedAt = new Date().toISOString();
  const weakest = [...records].sort((a, b) => a.score.score - b.score.score).slice(0, 50);
  const albumFailures = records.filter((r) => r.album.resolutionIssues.length > 0);
  const storyIssues = records.filter(
    (r) => r.stories.duplicateCount + r.stories.repeatedSourceFactCount + r.stories.lowInformationCount > 0,
  );
  const weakFactPackages = records.filter((r) => r.facts.weakFactCount > 0);
  const sourceIssues = records.filter((r) => r.sources.issues.length > 0);
  const reference = records.find((r) => r.rvtr === REFERENCE_RVTR);
  const avgScore = records.length
    ? Math.round(records.reduce((n, r) => n + r.score.score, 0) / records.length)
    : 0;

  const weakFactExamples = weakFactPackages.flatMap((r) =>
    r.facts.weakFacts.slice(0, 3).map((f) => [
      r.rvtr,
      r.artist,
      r.title,
      f.reason,
      truncate(f.factText),
    ]),
  ).slice(0, 40);

  const storyExamples = storyIssues.flatMap((r) =>
    (r.stories.examples.length ? r.stories.examples : ["story issue detected"]).slice(0, 2).map((example) => [
      r.rvtr,
      r.title,
      String(r.stories.storyCount),
      String(r.stories.duplicateCount),
      String(r.stories.repeatedSourceFactCount),
      truncate(example),
    ]),
  ).slice(0, 30);

  return `# Package Quality Audit

Generated: ${generatedAt}

Scope: existing Song Packages only. This audit does **not** modify package generation, package data, routes, UI, or review workflow.

## Summary

| Metric | Count |
| --- | ---: |
| Packages audited | **${records.length}** |
| Average quality score | **${avgScore}** |
| Album failures | **${albumFailures.length}** |
| Story issue packages | **${storyIssues.length}** |
| Fact relevance issue packages | **${weakFactPackages.length}** |
| Source coverage issue packages | **${sourceIssues.length}** |

## Reference Example — ${REFERENCE_RVTR}

${reference ? mdTable([
  ["Field", "Value"],
  ["Artist", reference.artist],
  ["Title", reference.title],
  ["Score", String(reference.score.score)],
  ["Album detected", reference.album.albumDetected ?? "—"],
  ["Album issues", reference.album.resolutionIssues.join(", ") || "none"],
  ["Weak facts", String(reference.facts.weakFactCount)],
  ["Sources", `${reference.sources.sourceCount} (${reference.sources.wikipediaShare}% Wikipedia)`],
  ["Primary issues", reference.score.issues.join(", ") || "none"],
]) : "_Reference package not found._"}

## Top 50 Weakest Packages

${mdTable([
  ["Score", "RVTR", "Artist", "Title", "Album", "Weak Facts", "Sources", "Issues"],
  ...weakest.map((r) => [
    String(r.score.score),
    r.rvtr,
    r.artist,
    r.title,
    r.album.albumDetected ?? "—",
    `${r.facts.weakFactCount}/${r.facts.factCount}`,
    `${r.sources.sourceCount} src / ${r.sources.wikipediaShare}% wiki`,
    r.score.issues.slice(0, 5).join(", ") || "—",
  ]),
])}

## Album Resolution Report

${mdTable([
  ["RVTR", "Artist", "Title", "Album detected", "Album confidence", "Resolution issue"],
  ...albumFailures.map((r) => [
    r.rvtr,
    r.artist,
    r.title,
    r.album.albumDetected ?? "—",
    String(r.album.albumConfidence),
    r.album.resolutionIssues.join(", "),
  ]),
])}

## Story Duplication Report

${storyExamples.length ? mdTable([
  ["RVTR", "Title", "Stories", "Duplicates", "Repeated Facts", "Example"],
  ...storyExamples,
]) : "_No story duplication or repeated-fact issues detected._"}

## Fact Relevance Report

${weakFactExamples.length ? mdTable([
  ["RVTR", "Artist", "Title", "Reason", "Fact"],
  ...weakFactExamples,
]) : "_No weak facts detected._"}

## Source Coverage Report

${mdTable([
  ["RVTR", "Artist", "Title", "Sources", "Canonical", "Wikipedia", "Secondary", "Issues"],
  ...sourceIssues.map((r) => [
    r.rvtr,
    r.artist,
    r.title,
    String(r.sources.sourceCount),
    String(r.sources.canonicalSourceCount),
    String(r.sources.wikipediaSourceCount),
    String(r.sources.secondarySourceCount),
    r.sources.issues.join(", "),
  ]),
])}

## Recommended Fixes Ranked By Impact

1. **Album resolution before external research** — recover \`metadata.albumTitle\` / RVAL album context so relationship maps stop rendering Unknown Album and album facts are anchored.
2. **Fact relevance filter before auto-approval** — block artist-family, childhood, parent occupation, and generic biography facts unless they directly support the song.
3. **Song-first source targeting** — prefer song/recording/chart/video sources before generic artist pages; require at least one non-Wikipedia secondary source for high-quality packages.
4. **Story dedupe by fact set** — prevent multiple story headlines from using the same primary/supporting fact cluster.
5. **Relationship completeness score in review UI** — surface missing album, missing cover, missing chart, and missing VDJ media as separate quality warnings without blocking package creation.
`;
}

async function main() {
  const index = await loadSongPackageIndex();
  const packages: SongPackage[] = [];
  for (const entry of index.packages) {
    const pkg = await loadSongPackage(entry.rvtr);
    if (pkg) packages.push(pkg);
  }

  const records = packages.map(auditPackage).sort((a, b) => a.score.score - b.score.score);
  const json = {
    generatedAt: new Date().toISOString(),
    scope: "existing_song_packages",
    audited: records.length,
    referenceRvtr: REFERENCE_RVTR,
    weakest: records.slice(0, 50).map((r) => r.score),
    albumFailures: records.filter((r) => r.album.resolutionIssues.length > 0).map((r) => r.album),
    storyDuplication: records.filter(
      (r) => r.stories.duplicateCount + r.stories.repeatedSourceFactCount + r.stories.lowInformationCount > 0,
    ).map((r) => r.stories),
    factRelevance: records.filter((r) => r.facts.weakFactCount > 0).map((r) => r.facts),
    sourceCoverage: records.filter((r) => r.sources.issues.length > 0).map((r) => r.sources),
    packages: records,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(JSON_PATH, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  await writeFile(MD_PATH, buildMarkdown(records), "utf8");

  console.log("Package Quality Audit complete");
  console.log(`  Packages audited: ${records.length}`);
  console.log(`  Weakest score:    ${records[0]?.score.score ?? "n/a"}`);
  console.log(`  Report:           ${MD_PATH}`);
  console.log(`  JSON:             ${JSON_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
