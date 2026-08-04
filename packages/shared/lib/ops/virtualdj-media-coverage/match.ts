import "server-only";

import { access } from "fs/promises";
import { basename, extname } from "path";

import { normVdjPath, type VdjLibraryEntry } from "@/lib/ops/intelligence/vdj-database";

import { probeManagedAudioFile } from "./audio/audio-probe";
import { extractVersionMarkers, versionCompatibility } from "./version-evidence";
import {
  artistTitleKey,
  normalizeArtistText,
  normalizeIdentityText,
  rvtrFromLabel,
  type VirtualDjLibraryIndex,
} from "./vdj-index";
import type { CandidateEvidence, CoverageTargetSong } from "./types";
import { classifyManagedMediaPath } from "./managed-roots";

type MatchMethod = CandidateEvidence["matchMethod"];

const METHOD_RANK: Record<MatchMethod, number> = {
  exact_filepath: 6,
  exact_rvtr: 5,
  structured_relationship: 4,
  exact_artist_title: 3,
  title_first: 2,
  artist_first: 1,
  filename_support: 1,
};

export function candidateHasRequiredConfirmation(
  candidate: Pick<CandidateEvidence, "matchMethod" | "componentScores">,
): boolean {
  if (candidate.matchMethod === "title_first") {
    return candidate.componentScores.artist > 0;
  }
  if (candidate.matchMethod === "artist_first") {
    return candidate.componentScores.title > 0;
  }
  return true;
}

function addCandidate(
  candidates: Map<number, MatchMethod>,
  indices: readonly number[] | undefined,
  method: MatchMethod,
): void {
  for (const index of indices ?? []) {
    const previous = candidates.get(index);
    if (!previous || METHOD_RANK[method] > METHOD_RANK[previous]) candidates.set(index, method);
  }
}

function durationAgreement(target: number | null, candidate: number | null): number {
  if (target == null || candidate == null || target <= 0) return 0;
  return Math.abs(target - candidate) / target <= 0.05 ? 8 : 0;
}

function filenameAgreement(entry: VdjLibraryEntry, target: CoverageTargetSong): number {
  const file = normalizeIdentityText(basename(entry.filePath, extname(entry.filePath)));
  const artist = normalizeIdentityText(target.artist);
  const title = normalizeIdentityText(target.title);
  return artist && title && file.includes(artist) && file.includes(title) ? 10 : 0;
}

function scoreCandidate(
  entry: VdjLibraryEntry,
  method: MatchMethod,
  target: CoverageTargetSong,
  targetRvtr: string | null,
): Omit<CandidateEvidence, "entryIndex" | "fileExists" | "probe"> {
  const targetArtist = normalizeArtistText(target.artist);
  const targetTitle = normalizeIdentityText(target.title);
  const candidateArtist = normalizeArtistText(entry.artist);
  const candidateTitle = normalizeIdentityText(entry.title);
  const candidateRvtr = rvtrFromLabel(entry.label);
  const candidateMarkers = extractVersionMarkers(entry.title, entry.remix, entry.album, entry.filePath);
  const version = versionCompatibility({
    requested: target.requestedVersionMarkers,
    candidate: candidateMarkers,
    targetDurationSeconds: target.expectedDurationSeconds,
    candidateDurationSeconds: entry.durationSeconds ?? null,
  });

  const filepath = method === "exact_filepath" ? 100 : 0;
  const rvtr = targetRvtr && candidateRvtr === targetRvtr ? 100 : 0;
  const structured = method === "structured_relationship" ? 90 : 0;
  const artist = targetArtist && targetArtist === candidateArtist ? 35 : 0;
  const title = targetTitle && targetTitle === candidateTitle ? 45 : 0;
  const album =
    target.album && normalizeIdentityText(target.album) === normalizeIdentityText(entry.album) ? 5 : 0;
  const year = target.year && entry.year && Math.abs(target.year - entry.year) <= 1 ? 5 : 0;
  const duration = durationAgreement(target.expectedDurationSeconds, entry.durationSeconds ?? null);
  const filename = filenameAgreement(entry, target);
  const rawScore =
    filepath || rvtr || structured
      ? Math.max(filepath, rvtr, structured) + version.score
      : artist + title + album + year + duration + filename + version.score;
  const score = Math.max(0, Math.min(100, rawScore));
  const evidence: string[] = [];
  if (filepath) evidence.push("exact target filepath found in VirtualDJ XML");
  if (rvtr) evidence.push(`exact ${targetRvtr} Label match`);
  if (structured) evidence.push("structured canonical media relationship resolves to this XML path");
  if (artist) evidence.push("exact normalized artist");
  if (title) evidence.push("exact normalized title");
  if (album) evidence.push("album agrees");
  if (year) evidence.push("year agrees");
  if (duration) evidence.push("duration within 5%");
  if (filename) evidence.push("filename supports artist and title");
  if (version.reason) evidence.push(version.reason);

  return {
    filePath: entry.filePath,
    filePathNorm: entry.filePathNorm,
    managedClass: entry.managedClass ?? classifyManagedMediaPath(entry.filePath),
    artist: entry.artist,
    title: entry.title,
    album: entry.album,
    year: entry.year,
    remix: entry.remix,
    rvtr: candidateRvtr,
    durationSeconds: entry.durationSeconds ?? null,
    fileSizeBytes: entry.fileSizeBytes ?? null,
    extension: entry.extension ?? extname(entry.filePath).replace(/^\./, "").toLowerCase(),
    matchMethod: method,
    score,
    componentScores: {
      filepath,
      rvtr,
      structured,
      artist,
      title,
      album,
      year,
      duration,
      filename,
      version: version.score,
    },
    evidence,
    versionMarkers: candidateMarkers,
    versionCompatible: version.compatible,
    versionReason: version.reason,
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function matchTargetAgainstInventory(
  target: CoverageTargetSong,
  index: VirtualDjLibraryIndex,
  structured?: { rvtr: string | null; xmlPaths: string[] } | null,
): Promise<{ rvtr: string | null; candidates: CandidateEvidence[] }> {
  const candidates = new Map<number, MatchMethod>();
  const direct = target.sourcePath
    ? index.byFilePath.get(normVdjPath(target.sourcePath))
    : undefined;
  addCandidate(candidates, direct, "exact_filepath");

  let targetRvtr: string | null = target.rvtr?.trim().toUpperCase() ?? null;
  for (const entryIndex of direct ?? []) {
    targetRvtr = rvtrFromLabel(index.entries[entryIndex]?.label ?? "") ?? targetRvtr;
  }
  targetRvtr = targetRvtr ?? structured?.rvtr ?? null;
  if (targetRvtr) addCandidate(candidates, index.byRvtr.get(targetRvtr), "exact_rvtr");
  for (const filePath of structured?.xmlPaths ?? []) {
    addCandidate(candidates, index.byFilePath.get(normVdjPath(filePath)), "structured_relationship");
  }

  const artist = normalizeArtistText(target.artist);
  const title = normalizeIdentityText(target.title);
  addCandidate(candidates, index.byArtistTitle.get(artistTitleKey(target.artist, target.title)), "exact_artist_title");
  addCandidate(candidates, index.byTitle.get(title), "title_first");
  addCandidate(candidates, index.byArtist.get(artist), "artist_first");

  const scored = [...candidates.entries()]
    .map(([entryIndex, method]) => {
      const entry = index.entries[entryIndex];
      return entry ? { entryIndex, ...scoreCandidate(entry, method, target, targetRvtr) } : null;
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null)
    .filter(candidateHasRequiredConfirmation)
    .filter((candidate) => candidate.score >= 35 || candidate.matchMethod === "exact_filepath")
    .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));

  const evidence = await Promise.all(
    scored.map(async (candidate): Promise<CandidateEvidence> => {
      if (!["managed_audio", "managed_video"].includes(candidate.managedClass)) {
        return { ...candidate, fileExists: null, probe: null };
      }
      const fileExists = await exists(candidate.filePath);
      const probe =
        candidate.managedClass === "managed_audio" && fileExists && candidate.score >= 50
          ? await probeManagedAudioFile(candidate.filePath)
          : null;
      return { ...candidate, fileExists, probe };
    }),
  );
  return { rvtr: targetRvtr, candidates: evidence };
}
