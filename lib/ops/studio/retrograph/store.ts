import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import {
  dossierOutputPath,
  retrographLegacyDossierPath,
  retrographOutputPath,
} from "@/lib/studio/package";

import { migrateLegacyDossierToRetrograph, isLegacyDossierPayload } from "./migrate-legacy-dossier";
import type { Retrograph } from "./types";

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function legacyDossierMirror(graph: Retrograph): Record<string, unknown> {
  return {
    version: 1,
    rvtr: graph.entity.rvtr,
    artist: graph.song.artist,
    title: graph.song.title,
    generatedAt: graph.entity.generatedAt,
    editorDistillVersion: graph.entity.editorDistillVersion,
    identity: graph.song,
    charts: graph.charts,
    recordings: graph.album.recordings,
    performances: graph.performances,
    facts: [...graph.facts, ...graph.pendingFacts],
    images: graph.media.images,
    timelines: graph.timeline,
    sources: graph.sources,
    vdjMetadata: graph.vdjMetadata,
    relatedArtists: graph.artist.relatedArtists,
    relatedSongs: graph.relatedSongs,
    missingAreas: graph.unknowns,
    confidence: graph.confidence,
    dedupeReport: graph.dedupeReport,
    conflictReport: graph.conflictReport,
    factCounts: graph.factCounts,
  };
}

async function readJson(path: string): Promise<unknown | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Load Retrograph — primary: retrograph.json; fallback: dossier.json (migrated in memory). */
export async function loadRetrograph(rvtr: string): Promise<Retrograph | null> {
  const normalized = rvtr.trim().toUpperCase();

  const primary = await readJson(retrographOutputPath(normalized));
  if (primary && typeof primary === "object" && "entity" in (primary as object)) {
    return primary as Retrograph;
  }

  for (const legacyPath of [
    dossierOutputPath(normalized),
    retrographLegacyDossierPath(normalized),
  ]) {
    const legacy = await readJson(legacyPath);
    if (legacy && isLegacyDossierPayload(legacy)) {
      return migrateLegacyDossierToRetrograph(legacy);
    }
  }

  return null;
}

/** Persist Retrograph — writes retrograph.json + legacy dossier.json mirror for compatibility. */
export async function saveRetrograph(graph: Retrograph): Promise<void> {
  const rvtr = graph.entity.rvtr.trim().toUpperCase();
  await writeJson(retrographOutputPath(rvtr), graph);
  await writeJson(dossierOutputPath(rvtr), legacyDossierMirror(graph));
}

/** @deprecated Sprint 3.29 — use `loadRetrograph`. */
export const loadDossier = loadRetrograph;

/** @deprecated Sprint 3.29 — use `saveRetrograph`. */
export const saveDossier = saveRetrograph;
