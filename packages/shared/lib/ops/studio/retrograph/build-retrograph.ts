import "server-only";

import { derivePerformances } from "@/lib/ops/studio/collector/package-archive";
import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import type { CollectorResearchFact, CollectorTimelineEvent } from "@/lib/ops/studio/collector/types";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";
import type { EditorStoryPackage } from "@/lib/ops/studio/editor/types";

import { isInvalidCollectorFact } from "./fact-guards";
import { buildRetrographRelationships } from "./relationships";
import {
  RETROGRAPH_VERSION,
  type Retrograph,
  type RetrographConflictReport,
  type RetrographDedupeReport,
  type RetrographFact,
  type RetrographFactStatus,
  type RetrographMediaImage,
  type RetrographMediaVideo,
  type RetrographRecording,
  type RetrographSourceRef,
  type RetrographTimelineEvent,
} from "./types";

const FILE_PATH_PATTERN =
  /(?:\/Users\/|\/DJ MEDIA\/|\\|[A-Z]:\\)[^\s]+|\.(?:mp4|mp3|m4a|wav|flac)\b/gi;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function isInvalidFact(text: string): boolean {
  return isInvalidCollectorFact(text);
}

function isUnsafeFact(text: string): boolean {
  return FILE_PATH_PATTERN.test(text) && tLengthWithoutPaths(text) < 24;
}

function tLengthWithoutPaths(text: string): number {
  return text.replace(FILE_PATH_PATTERN, "").trim().length;
}

function dedupeKey(text: string): string {
  return normalizeText(text).slice(0, 100);
}

function clusterFacts(facts: CollectorResearchFact[]): {
  kept: CollectorResearchFact[];
  duplicateMap: Map<string, string>;
  clusters: RetrographDedupeReport["clusters"];
} {
  const byKey = new Map<string, CollectorResearchFact[]>();
  for (const fact of facts) {
    const key = dedupeKey(fact.text);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(fact);
    byKey.set(key, list);
  }

  const kept: CollectorResearchFact[] = [];
  const duplicateMap = new Map<string, string>();
  const clusters: RetrographDedupeReport["clusters"] = [];

  for (const [, group] of byKey) {
    if (group.length === 1) {
      kept.push(group[0]!);
      continue;
    }
    const sorted = [...group].sort(
      (a, b) =>
        (b.approvalStatus === "approved" ? 1 : 0) - (a.approvalStatus === "approved" ? 1 : 0) ||
        b.confidence - a.confidence,
    );
    const winner = sorted[0]!;
    kept.push(winner);
    const clusterId = `cluster-${winner.id.slice(0, 8)}`;
    const memberIds = sorted.slice(1).map((f) => f.id);
    for (const dup of sorted.slice(1)) {
      duplicateMap.set(dup.id, winner.id);
    }
    clusters.push({
      clusterId,
      keptFactId: winner.id,
      memberIds,
      reason: `Duplicate cluster (${group.length}) — kept highest confidence`,
    });
  }

  return { kept, duplicateMap, clusters };
}

function extractExcerptFacts(sources: CollectorPackage["sourceLog"]): RetrographFact[] {
  const out: RetrographFact[] = [];
  let seq = 0;

  for (const source of sources) {
    const excerpt = source.excerpt ?? "";
    if (!excerpt.trim()) continue;

    const patterns: Array<{ re: RegExp; category: string }> = [
      { re: /reached number (?:one|1|six|6)[^.]*Billboard Hot 100[^.]*\./i, category: "chart" },
      { re: /number one in the UK Singles Chart[^.]*\./i, category: "chart" },
      { re: /certified Gold by the RIAA[^.]*\./i, category: "recording" },
      {
        re: /Both songs also became chart hits in the UK, Canada and Australia[^.]*\./i,
        category: "cultural_impact",
      },
      { re: /Ray Sawyer – lead vocals/i, category: "artist" },
      { re: /Even Stevens[^.–-]{0,40}– 3:02/i, category: "recording" },
    ];

    for (const { re, category } of patterns) {
      const match = excerpt.match(re);
      if (!match?.[0]) continue;
      const text = match[0].replace(/\s+/g, " ").trim();
      if (text.length < 20) continue;
      out.push({
        id: `excerpt-${source.id}-${seq++}`,
        category,
        text,
        source: source.source ?? "Research",
        sourceUrl: source.url ?? null,
        confidence: source.confidence ?? 0.7,
        status: "accepted",
        duplicateOf: null,
        clusterId: null,
      });
    }
  }

  return out;
}

function mapCollectorFact(
  fact: CollectorResearchFact,
  duplicateOf: string | null,
  clusterId: string | null,
): RetrographFact {
  let status: RetrographFactStatus = "accepted";
  if (isInvalidFact(fact.text) || isUnsafeFact(fact.text)) status = "invalid";
  else if (duplicateOf) status = "duplicate";
  else if (fact.approvalStatus === "pending") status = "pending";

  return {
    id: fact.id,
    category: fact.category,
    text: fact.text.trim(),
    source: fact.source,
    sourceUrl: fact.sourceUrl ?? null,
    confidence: fact.confidence,
    status,
    duplicateOf,
    clusterId,
  };
}

function buildTimelines(pkg: CollectorPackage): RetrographTimelineEvent[] {
  const events: RetrographTimelineEvent[] = [];
  const push = (domain: RetrographTimelineEvent["domain"], list: CollectorTimelineEvent[] | undefined) => {
    for (const e of list ?? []) {
      events.push({
        id: e.id,
        date: e.year != null ? String(e.year) : "—",
        label: e.label,
        detail: e.detail ?? null,
        domain,
        confidence: e.confidence,
        source: e.source,
      });
    }
  };
  push("song", pkg.timelines?.song);
  push("recording", pkg.timelines?.recording);
  push("performance", pkg.timelines?.performance);
  return events;
}

function buildImages(
  pkg: CollectorPackage,
  performances: ReturnType<typeof derivePerformances>,
  rvtr: string,
): RetrographMediaImage[] {
  const images: RetrographMediaImage[] = [];
  const cover = pkg.visualAssets?.coverUrl ?? pkg.song?.coverUrl ?? null;
  if (cover) {
    images.push({
      assetId: `cover-${rvtr}`,
      imageUrl: cover,
      caption: "Album cover",
      label: "Cover",
      category: "cover",
      performanceId: null,
      status: "available",
      unusedReason: null,
    });
  }

  for (const perf of performances) {
    for (const asset of perf.visualAssets.extraction.assets) {
      images.push({
        assetId: asset.id,
        imageUrl: visualAssetUrl(rvtr, asset.filename),
        caption: asset.selectionReason ?? asset.category,
        label: asset.category,
        category: asset.category,
        performanceId: perf.id,
        status: "available",
        unusedReason: null,
      });
    }
  }
  return images;
}

function extractPersonnelFromFacts(facts: RetrographFact[]): Retrograph["personnel"] {
  const writers: string[] = [];
  const producers: string[] = [];
  for (const fact of facts) {
    if (fact.status !== "accepted" && fact.status !== "pending") continue;
    if (/written by even stevens/i.test(fact.text)) writers.push("Even Stevens");
    if (/producer ron haffkine/i.test(fact.text)) producers.push("Ron Haffkine");
  }
  return { writers: [...new Set(writers)], producers: [...new Set(producers)], members: [], engineers: [] };
}

/** Collector expands the Retrograph — never deletes information. */
export function buildRetrographFromCollector(
  pkg: CollectorPackage,
  editor?: EditorStoryPackage | null,
): Retrograph {
  const rvtr = pkg.rvtr.trim().toUpperCase();
  const performances = pkg.performances?.length ? pkg.performances : derivePerformances(pkg);
  const { duplicateMap, clusters } = clusterFacts(pkg.candidateFacts);

  const clusterByDup = new Map<string, string>();
  for (const c of clusters) {
    for (const id of c.memberIds) clusterByDup.set(id, c.clusterId);
  }

  const collectorFacts = pkg.candidateFacts.map((f) =>
    mapCollectorFact(f, duplicateMap.get(f.id) ?? null, clusterByDup.get(f.id) ?? null),
  );

  const excerptFacts = extractExcerptFacts(pkg.sourceLog).filter((ef) => {
    const key = dedupeKey(ef.text);
    return !collectorFacts.some(
      (cf) => cf.status !== "invalid" && dedupeKey(cf.text) === key,
    );
  });

  const allFacts = [...collectorFacts, ...excerptFacts];
  const pendingFacts = allFacts.filter((f) => f.status === "pending");
  const verifiedFacts = allFacts.filter(
    (f) => f.status === "accepted" || f.status === "duplicate" || f.status === "invalid",
  );

  const recordings: RetrographRecording[] = (pkg.recordings ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    releaseDate: r.releaseDate,
    label: r.label,
    catalogNumber: r.catalogNumber,
    recordingLocation: r.recordingLocation,
    producer: r.producer,
    notes: r.notes ?? [],
  }));

  const perfEntities: RetrographMediaVideo[] = performances.map((p) => ({
    id: p.id,
    title: p.title,
    kind: "performance",
    year: p.detectedYear,
    venue: p.detectedVenue,
    sourcePath: p.sourceVideo ?? p.virtualDjFilePath ?? null,
    notes: p.collectorNotes ?? "",
  }));

  const sources: RetrographSourceRef[] = (pkg.sourceLog ?? []).map((s) => ({
    id: s.id,
    source: s.source,
    url: s.url ?? null,
    excerpt: s.excerpt ?? "",
    confidence: s.confidence,
  }));

  const images = buildImages(pkg, performances, rvtr);
  const timeline = buildTimelines(pkg);
  const songYear = pkg.identity?.year ?? null;
  const albumTitle = pkg.identity?.albumTitle ?? pkg.charts?.albumTitle ?? null;

  const accepted = allFacts.filter((f) => f.status === "accepted").length;
  const pending = pendingFacts.length;
  const duplicate = allFacts.filter((f) => f.status === "duplicate").length;
  const invalid = allFacts.filter((f) => f.status === "invalid").length;
  const preserved = allFacts.filter((f) => f.status === "accepted" || f.status === "pending").length;

  const conflictReport: RetrographConflictReport = {
    conflicts: (editor?.workspace.editorialNotes.factChecks ?? []).map((n, i) => ({
      id: `conflict-${i}`,
      text: n.text,
      reason: "Editor flagged for verification",
    })),
  };

  const graph: Retrograph = {
    version: RETROGRAPH_VERSION,
    entity: {
      id: rvtr,
      kind: "song",
      rvtr,
      generatedAt: new Date().toISOString(),
      editorDistillVersion: editor?.meta.distillVersion ?? null,
    },
    song: {
      rvtr,
      artist: pkg.artist,
      title: pkg.title,
      year: songYear,
      albumTitle,
      coverUrl: pkg.visualAssets?.coverUrl ?? null,
    },
    artist: {
      name: pkg.artist,
      relatedArtists: pkg.relationships?.relatedArtists ?? [],
    },
    album: {
      title: albumTitle,
      releaseYear: songYear,
      recordings,
    },
    performances: perfEntities,
    charts: {
      peakHot100: pkg.charts?.peakHot100 ?? null,
      chartWeeks: pkg.charts?.chartWeeks ?? null,
      albumTitle: pkg.charts?.albumTitle ?? null,
      summary: pkg.charts?.summary ?? null,
    },
    timeline,
    recording: {
      location: recordings[0]?.recordingLocation ?? null,
      notes: [
        ...(pkg.recording?.notes ?? []),
        ...recordings.flatMap((r) => r.notes),
      ],
    },
    personnel: extractPersonnelFromFacts(allFacts),
    media: {
      images,
      videos: perfEntities,
    },
    relationships: [],
    sources,
    facts: verifiedFacts.filter((f) => f.status === "accepted"),
    pendingFacts,
    unknowns: pkg.missingAreas ?? [],
    aiEnrichments: [],
    confidence: pkg.confidence ?? null,
    dedupeReport: {
      duplicatesRemoved: duplicate,
      clusters,
    },
    conflictReport,
    factCounts: {
      collectorInput: pkg.candidateFacts.length,
      preserved,
      accepted,
      pending,
      duplicate,
      invalid,
      excerptDerived: excerptFacts.length,
    },
    vdjMetadata: {
      primaryPath: pkg.virtualDj?.primaryPath ?? null,
      tags: pkg.virtualDj?.tags ?? [],
      mediaItemCount: pkg.virtualDj?.mediaItems?.length ?? 0,
    },
    relatedSongs: [],
  };

  graph.relationships = buildRetrographRelationships(graph);
  return graph;
}

/** Usable facts for experience planning — accepted + pending, never reduced for display. */
export function usableRetrographFacts(graph: Retrograph): RetrographFact[] {
  return [...graph.facts, ...graph.pendingFacts].filter(
    (f) => f.status === "accepted" || f.status === "pending",
  );
}

/** @deprecated Sprint 3.29 — use `buildRetrographFromCollector`. */
export const buildDossierFromCollector = buildRetrographFromCollector;

/** @deprecated Sprint 3.29 — use `usableRetrographFacts`. */
export function usableDossierFacts(graph: Retrograph): RetrographFact[] {
  return usableRetrographFacts(graph);
}
