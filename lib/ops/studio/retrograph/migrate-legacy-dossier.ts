/**
 * Upgrade legacy dossier.json (v1 flat) to Retrograph structure.
 */

import { RETROGRAPH_VERSION, type Retrograph, type RetrographFact } from "./types";
import { buildRetrographRelationships } from "./relationships";

type LegacyDossier = {
  version?: number;
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  editorDistillVersion?: string | null;
  identity?: Retrograph["song"];
  charts?: Retrograph["charts"];
  recordings?: Retrograph["album"]["recordings"];
  performances?: Retrograph["performances"];
  facts?: Retrograph["facts"];
  images?: Retrograph["media"]["images"];
  timelines?: Retrograph["timeline"];
  sources?: Retrograph["sources"];
  vdjMetadata?: Retrograph["vdjMetadata"];
  relatedArtists?: string[];
  relatedSongs?: string[];
  missingAreas?: string[];
  confidence?: Retrograph["confidence"];
  dedupeReport?: Retrograph["dedupeReport"];
  conflictReport?: Retrograph["conflictReport"];
  factCounts?: Retrograph["factCounts"];
};

export function isLegacyDossierPayload(raw: unknown): raw is LegacyDossier {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o.rvtr === "string" && !("entity" in o);
}

export function migrateLegacyDossierToRetrograph(legacy: LegacyDossier): Retrograph {
  const rvtr = legacy.rvtr.trim().toUpperCase();
  const song = legacy.identity ?? {
    rvtr,
    artist: legacy.artist,
    title: legacy.title,
    year: null,
    albumTitle: null,
    coverUrl: null,
  };

  const facts = legacy.facts ?? [];
  const pendingFacts = facts.filter((f) => f.status === "pending");
  const verifiedFacts = facts.filter((f) => f.status !== "pending");

  const performances = legacy.performances ?? [];
  const recordings = legacy.recordings ?? [];

  const graph: Retrograph = {
    version: RETROGRAPH_VERSION,
    entity: {
      id: rvtr,
      kind: "song",
      rvtr,
      generatedAt: legacy.generatedAt,
      editorDistillVersion: legacy.editorDistillVersion ?? null,
    },
    song,
    artist: {
      name: song.artist,
      relatedArtists: legacy.relatedArtists ?? [],
    },
    album: {
      title: song.albumTitle,
      releaseYear: song.year,
      recordings,
    },
    performances,
    charts: legacy.charts ?? {
      peakHot100: null,
      chartWeeks: null,
      albumTitle: null,
      summary: null,
    },
    timeline: legacy.timelines ?? [],
    recording: {
      location: recordings[0]?.recordingLocation ?? null,
      notes: recordings.flatMap((r) => r.notes),
    },
    personnel: {
      writers: [],
      producers: recordings.map((r) => r.producer).filter(Boolean) as string[],
      members: [],
      engineers: [],
    },
    media: {
      images: legacy.images ?? [],
      videos: performances,
    },
    relationships: [],
    sources: legacy.sources ?? [],
    facts: verifiedFacts,
    pendingFacts,
    unknowns: legacy.missingAreas ?? [],
    aiEnrichments: [],
    confidence: legacy.confidence ?? null,
    dedupeReport: legacy.dedupeReport ?? { duplicatesRemoved: 0, clusters: [] },
    conflictReport: legacy.conflictReport ?? { conflicts: [] },
    factCounts: legacy.factCounts ?? {
      collectorInput: facts.length,
      preserved: facts.filter((f) => f.status === "accepted" || f.status === "pending").length,
      accepted: facts.filter((f) => f.status === "accepted").length,
      pending: pendingFacts.length,
      duplicate: facts.filter((f) => f.status === "duplicate").length,
      invalid: facts.filter((f) => f.status === "invalid").length,
      excerptDerived: 0,
    },
    vdjMetadata: legacy.vdjMetadata ?? {
      primaryPath: null,
      tags: [],
      mediaItemCount: 0,
    },
    relatedSongs: legacy.relatedSongs ?? [],
  };

  graph.relationships = buildRetrographRelationships(graph);
  return graph;
}

/** Legacy flat view for transitional callers expecting dossier field names. */
export function retrographLegacyFlatView(graph: Retrograph): {
  rvtr: string;
  artist: string;
  title: string;
  identity: Retrograph["song"];
  facts: RetrographFact[];
  images: Retrograph["media"]["images"];
  timelines: Retrograph["timeline"];
  performances: Retrograph["performances"];
  recordings: Retrograph["album"]["recordings"];
  charts: Retrograph["charts"];
  sources: Retrograph["sources"];
  relatedArtists: string[];
  missingAreas: string[];
} {
  return {
    rvtr: graph.entity.rvtr,
    artist: graph.song.artist,
    title: graph.song.title,
    identity: graph.song,
    facts: [...graph.facts, ...graph.pendingFacts],
    images: graph.media.images,
    timelines: graph.timeline,
    performances: graph.performances,
    recordings: graph.album.recordings,
    charts: graph.charts,
    sources: graph.sources,
    relatedArtists: graph.artist.relatedArtists,
    missingAreas: graph.unknowns,
  };
}
