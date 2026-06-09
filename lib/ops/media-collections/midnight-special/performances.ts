import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { parseEpisodeTitle } from "../parse-episode-title";
import { listEpisodes } from "../state";
import {
  classifyPerformance,
  classifyQueue,
  compositionCounts,
  summaryFromComposition,
  type ClassifiedPerformance,
  type QueueComposition,
} from "./classify-segment";
import { parseArtistSong, generateCandidateManifest } from "./parse-performances";
import {
  msCandidateManifestPath,
  msCandidatesDir,
  msEpisodePerformancePath,
  msPerformanceEpisodesDir,
  msPerformanceIndexPath,
  msPerformancesDir,
  MS_COLLECTION_ID,
} from "./paths";
import type {
  MsCandidateManifest,
  MsEpisodePerformanceManifest,
  MsPerformanceCollectionIndex,
  MsPerformanceCollectionStats,
  MsPerformanceRecord,
  PerformanceConfidence,
  PerformanceStatus,
} from "./types";

export type { PerformanceStatus };
import { parseYearFromAirDate, secToTimecode } from "./timecode";

const PARSER_VERSION = "ms-perf-v1";
const LOCKED_STATUSES: PerformanceStatus[] = ["accepted", "rejected", "exported"];
const AVG_CLIP_BYTES = 18 * 1024 * 1024;

export function performanceId(episodeId: string, chapterIndex: number): string {
  return `${episodeId}:ch${String(chapterIndex).padStart(3, "0")}`;
}

export function reviewStatusToPerformanceStatus(
  reviewStatus: string,
  confidence: PerformanceConfidence,
): PerformanceStatus {
  if (reviewStatus === "accepted" || reviewStatus === "adjusted") return "accepted";
  if (reviewStatus === "rejected") return "rejected";
  if (reviewStatus === "pending") {
    return confidence === "exact" ? "candidate" : "candidate";
  }
  return "candidate";
}

function emptyStats(): MsPerformanceCollectionStats {
  return {
    episodes_downloaded: 0,
    episodes_with_performances: 0,
    episodes_zero_candidates: 0,
    performances_total: 0,
    candidate: 0,
    accepted: 0,
    review: 0,
    rejected: 0,
    exported: 0,
    ready_to_export: 0,
    failed_parse_count: 0,
    estimated_export_bytes: 0,
    estimated_export_gb: 0,
  };
}

function recordFromParsed(
  episode: {
    id: string;
    title: string;
    air_date?: string;
    source_url: string;
    download_path?: string | null;
  },
  raw: {
    artist: string;
    song: string;
    start_sec: number;
    end_sec: number;
    confidence: PerformanceConfidence;
    confidence_score: number;
    chapter_title: string;
    chapter_index: number;
  },
  existing?: MsPerformanceRecord,
): MsPerformanceRecord {
  const failed_parse = !parseArtistSong(raw.chapter_title);
  const base: MsPerformanceRecord = {
    performance_id: performanceId(episode.id, raw.chapter_index),
    episode_id: episode.id,
    episode_title: episode.title,
    air_date: episode.air_date,
    artist: raw.artist,
    song: raw.song,
    start_seconds: raw.start_sec,
    end_seconds: raw.end_sec,
    start_timecode: secToTimecode(raw.start_sec),
    end_timecode: secToTimecode(raw.end_sec),
    confidence: raw.confidence,
    confidence_score: raw.confidence_score,
    source_chapter: raw.chapter_title,
    source_url: episode.source_url,
    chapter_index: raw.chapter_index,
    status: "candidate",
    failed_parse,
  };

  if (!existing) return base;

  if (LOCKED_STATUSES.includes(existing.status)) {
    return {
      ...existing,
      episode_title: episode.title,
      air_date: episode.air_date ?? existing.air_date,
      source_url: episode.source_url,
      source_chapter: raw.chapter_title,
      confidence: raw.confidence,
      confidence_score: raw.confidence_score,
      failed_parse,
    };
  }

  if (existing.manually_edited) {
    return {
      ...existing,
      episode_title: episode.title,
      air_date: episode.air_date ?? existing.air_date,
      source_url: episode.source_url,
      source_chapter: raw.chapter_title,
      confidence: raw.confidence,
      confidence_score: raw.confidence_score,
      failed_parse,
    };
  }

  return {
    ...base,
    status: existing.status,
    export_path: existing.export_path,
    manually_edited: existing.manually_edited,
  };
}

async function migrateFromCandidates(episodeId: string): Promise<MsEpisodePerformanceManifest | null> {
  try {
    const raw = JSON.parse(
      await readFile(msCandidateManifestPath(episodeId), "utf8"),
    ) as MsCandidateManifest;
    if (raw?.version !== 1 || raw.episode_id !== episodeId) return null;

    const performances: MsPerformanceRecord[] = raw.performances.map((p) => ({
      performance_id: performanceId(episodeId, p.chapter_index),
      episode_id: episodeId,
      episode_title: raw.episode_title,
      air_date: raw.air_date,
      artist: p.artist,
      song: p.song,
      start_seconds: p.start_sec,
      end_seconds: p.end_sec,
      start_timecode: p.start_timecode,
      end_timecode: p.end_timecode,
      confidence: p.confidence,
      confidence_score: p.confidence_score,
      source_chapter: p.chapter_title,
      source_url: "",
      chapter_index: p.chapter_index,
      status: reviewStatusToPerformanceStatus(p.review_status, p.confidence),
      export_path: p.export_path,
      manually_edited: p.review_status === "adjusted",
      failed_parse: !parseArtistSong(p.chapter_title),
    }));

    const manifest: MsEpisodePerformanceManifest = {
      version: 1,
      collection_id: MS_COLLECTION_ID,
      episode_id: episodeId,
      episode_title: raw.episode_title,
      air_date: raw.air_date,
      air_year: raw.air_year,
      source_url: "",
      video_path: raw.video_path,
      generated_at: raw.generated_at,
      parser_version: raw.parser_version,
      performances,
    };
    await saveEpisodePerformanceManifest(manifest);
    return manifest;
  } catch {
    return null;
  }
}

export async function saveEpisodePerformanceManifest(
  manifest: MsEpisodePerformanceManifest,
): Promise<string> {
  await mkdir(msPerformanceEpisodesDir(), { recursive: true });
  const path = msEpisodePerformancePath(manifest.episode_id);
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return path;
}

export async function loadEpisodePerformanceManifest(
  episodeId: string,
): Promise<MsEpisodePerformanceManifest | null> {
  try {
    const raw = JSON.parse(
      await readFile(msEpisodePerformancePath(episodeId), "utf8"),
    ) as MsEpisodePerformanceManifest;
    if (raw?.version === 1 && raw.episode_id === episodeId) return raw;
  } catch {
    // migrate or generate
  }
  return migrateFromCandidates(episodeId);
}

async function buildEpisodeManifest(episodeId: string): Promise<MsEpisodePerformanceManifest | null> {
  const generated = await generateCandidateManifest(episodeId);
  if (!generated) return null;

  const episodes = await listEpisodes(MS_COLLECTION_ID);
  const episode = episodes.find((e) => e.id === episodeId);
  if (!episode) return null;

  const existing = await loadEpisodePerformanceManifest(episodeId);
  const existingById = new Map(
    (existing?.performances ?? []).map((p) => [p.performance_id, p]),
  );

  const performances = generated.performances.map((raw) =>
    recordFromParsed(
      {
        id: episode.id,
        title: episode.title,
        air_date: generated.air_date ?? episode.air_date,
        source_url: episode.source_url,
        download_path: episode.download_path,
      },
      {
        artist: raw.artist,
        song: raw.song,
        start_sec: raw.start_sec,
        end_sec: raw.end_sec,
        confidence: raw.confidence,
        confidence_score: raw.confidence_score,
        chapter_title: raw.chapter_title,
        chapter_index: raw.chapter_index,
      },
      existingById.get(performanceId(episodeId, raw.chapter_index)),
    ),
  );

  const { air_date } = parseEpisodeTitle(episode.title);
  return {
    version: 1,
    collection_id: MS_COLLECTION_ID,
    episode_id: episodeId,
    episode_title: episode.title,
    air_date: generated.air_date ?? episode.air_date ?? air_date,
    air_year: generated.air_year ?? parseYearFromAirDate(air_date ?? episode.air_date),
    source_url: episode.source_url,
    video_path: generated.video_path,
    generated_at: new Date().toISOString(),
    parser_version: PARSER_VERSION,
    performances,
  };
}

function computeStats(
  episodeManifests: MsEpisodePerformanceManifest[],
  downloadedCount: number,
): MsPerformanceCollectionStats {
  const stats = emptyStats();
  stats.episodes_downloaded = downloadedCount;

  for (const ep of episodeManifests) {
    if (ep.performances.length === 0) continue;
    stats.episodes_with_performances += 1;
    for (const p of ep.performances) {
      stats.performances_total += 1;
      stats[p.status] += 1;
      if (p.failed_parse) stats.failed_parse_count += 1;
      if (p.status === "accepted") stats.ready_to_export += 1;
    }
  }

  stats.episodes_zero_candidates = Math.max(
    0,
    downloadedCount - stats.episodes_with_performances,
  );
  stats.estimated_export_bytes = stats.ready_to_export * AVG_CLIP_BYTES;
  stats.estimated_export_gb =
    Math.round((stats.estimated_export_bytes / (1024 * 1024 * 1024)) * 100) / 100;
  return stats;
}

export async function rebuildPerformanceIndex(): Promise<MsPerformanceCollectionIndex> {
  await mkdir(msPerformanceEpisodesDir(), { recursive: true });
  let files: string[] = [];
  try {
    files = (await readdir(msPerformanceEpisodesDir())).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }

  const manifests: MsEpisodePerformanceManifest[] = [];
  for (const file of files) {
    const episodeId = file.replace(/\.json$/, "");
    const m = await loadEpisodePerformanceManifest(episodeId);
    if (m) manifests.push(m);
  }

  const episodes = await listEpisodes(MS_COLLECTION_ID);
  const downloaded = episodes.filter((e) => e.downloaded || e.status === "downloaded");

  const index: MsPerformanceCollectionIndex = {
    version: 1,
    collection_id: MS_COLLECTION_ID,
    updated_at: new Date().toISOString(),
    parser_version: PARSER_VERSION,
    stats: computeStats(manifests, downloaded.length),
  };

  await mkdir(msPerformanceEpisodesDir(), { recursive: true });
  await writeFile(msPerformanceIndexPath(), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return index;
}

export async function loadPerformanceIndex(): Promise<MsPerformanceCollectionIndex | null> {
  try {
    const raw = JSON.parse(
      await readFile(msPerformanceIndexPath(), "utf8"),
    ) as MsPerformanceCollectionIndex;
    if (raw?.version === 1) return raw;
  } catch {
    return rebuildPerformanceIndex();
  }
  return rebuildPerformanceIndex();
}

export type GenerateAllResult = {
  episodes_processed: number;
  episodes_with_performances: number;
  episodes_zero_candidates: number;
  performances_total: number;
  failed_parse_count: number;
  errors: { episode_id: string; error: string }[];
};

export async function generateAllPerformanceCandidates(): Promise<GenerateAllResult> {
  const episodes = await listEpisodes(MS_COLLECTION_ID);
  const downloaded = episodes.filter((e) => e.downloaded || e.status === "downloaded");

  const result: GenerateAllResult = {
    episodes_processed: 0,
    episodes_with_performances: 0,
    episodes_zero_candidates: 0,
    performances_total: 0,
    failed_parse_count: 0,
    errors: [],
  };

  for (const ep of downloaded) {
    result.episodes_processed += 1;
    try {
      const manifest = await buildEpisodeManifest(ep.id);
      if (!manifest || manifest.performances.length === 0) {
        result.episodes_zero_candidates += 1;
        if (manifest) await saveEpisodePerformanceManifest(manifest);
        continue;
      }
      await saveEpisodePerformanceManifest(manifest);
      result.episodes_with_performances += 1;
      result.performances_total += manifest.performances.length;
      result.failed_parse_count += manifest.performances.filter((p) => p.failed_parse).length;
    } catch (e) {
      result.errors.push({
        episode_id: ep.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await rebuildPerformanceIndex();
  return result;
}

export type AcceptExactResult = {
  updated_to_accepted: number;
  updated_to_review: number;
  skipped_locked: number;
};

export async function acceptAllExactMatches(): Promise<AcceptExactResult> {
  await mkdir(msPerformanceEpisodesDir(), { recursive: true });
  const files = (await readdir(msPerformanceEpisodesDir())).filter((f) => f.endsWith(".json"));

  const outcome: AcceptExactResult = {
    updated_to_accepted: 0,
    updated_to_review: 0,
    skipped_locked: 0,
  };

  for (const file of files) {
    const episodeId = file.replace(/\.json$/, "");
    const manifest = await loadEpisodePerformanceManifest(episodeId);
    if (!manifest) continue;

    let changed = false;
    for (const p of manifest.performances) {
      if (LOCKED_STATUSES.includes(p.status)) {
        outcome.skipped_locked += 1;
        continue;
      }
      if (p.manually_edited) {
        outcome.skipped_locked += 1;
        continue;
      }

      if (p.confidence === "exact") {
        if (p.status !== "accepted") {
          p.status = "accepted";
          outcome.updated_to_accepted += 1;
          changed = true;
        }
      } else if (p.status === "candidate") {
        p.status = "review";
        outcome.updated_to_review += 1;
        changed = true;
      } else if (p.status !== "review") {
        p.status = "review";
        outcome.updated_to_review += 1;
        changed = true;
      }
    }

    if (changed) {
      manifest.generated_at = new Date().toISOString();
      await saveEpisodePerformanceManifest(manifest);
    }
  }

  await rebuildPerformanceIndex();
  return outcome;
}

export async function listReviewQueue(
  status: PerformanceStatus = "review",
): Promise<MsPerformanceRecord[]> {
  await mkdir(msPerformanceEpisodesDir(), { recursive: true });
  let files: string[] = [];
  try {
    files = (await readdir(msPerformanceEpisodesDir())).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const rows: MsPerformanceRecord[] = [];
  for (const file of files) {
    const episodeId = file.replace(/\.json$/, "");
    const manifest = await loadEpisodePerformanceManifest(episodeId);
    if (!manifest) continue;
    for (const p of manifest.performances) {
      if (p.status === status) rows.push(p);
    }
  }

  rows.sort((a, b) => {
    const ya = parseYearFromAirDate(a.air_date) ?? 0;
    const yb = parseYearFromAirDate(b.air_date) ?? 0;
    if (ya !== yb) return ya - yb;
    if (a.episode_id !== b.episode_id) return a.episode_id.localeCompare(b.episode_id);
    return a.start_seconds - b.start_seconds;
  });
  return rows;
}

export async function listAcceptedPerformances(): Promise<MsPerformanceRecord[]> {
  await mkdir(msPerformanceEpisodesDir(), { recursive: true });
  let files: string[] = [];
  try {
    files = (await readdir(msPerformanceEpisodesDir())).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const rows: MsPerformanceRecord[] = [];
  for (const file of files) {
    const episodeId = file.replace(/\.json$/, "");
    const manifest = await loadEpisodePerformanceManifest(episodeId);
    if (!manifest) continue;
    for (const p of manifest.performances) {
      if (p.status === "accepted" || p.status === "exported") rows.push(p);
    }
  }

  rows.sort((a, b) => {
    const ya = parseYearFromAirDate(a.air_date) ?? 0;
    const yb = parseYearFromAirDate(b.air_date) ?? 0;
    if (ya !== yb) return ya - yb;
    if (a.episode_id !== b.episode_id) return a.episode_id.localeCompare(b.episode_id);
    return a.start_seconds - b.start_seconds;
  });
  return rows;
}

export type BulkReviewAction =
  | "accept_exact_music"
  | "reject_comedy"
  | "reject_movie_clips"
  | "reject_intros";

export type BulkReviewResult = {
  action: BulkReviewAction;
  updated: number;
  skipped: number;
};

export async function bulkReviewQueueAction(
  action: BulkReviewAction,
): Promise<BulkReviewResult> {
  await mkdir(msPerformanceEpisodesDir(), { recursive: true });
  const files = (await readdir(msPerformanceEpisodesDir())).filter((f) => f.endsWith(".json"));

  const result: BulkReviewResult = { action, updated: 0, skipped: 0 };

  for (const file of files) {
    const episodeId = file.replace(/\.json$/, "");
    const manifest = await loadEpisodePerformanceManifest(episodeId);
    if (!manifest) continue;

    let changed = false;
    for (const p of manifest.performances) {
      if (p.status !== "review") continue;

      const bucket = classifyPerformance(p);
      let nextStatus: PerformanceStatus | null = null;

      if (action === "accept_exact_music") {
        if (bucket === "MUSIC" && p.confidence === "exact") nextStatus = "accepted";
        else result.skipped += 1;
      } else if (action === "reject_comedy") {
        if (bucket === "COMEDY") nextStatus = "rejected";
        else result.skipped += 1;
      } else if (action === "reject_movie_clips") {
        if (bucket === "MOVIE_CLIP") nextStatus = "rejected";
        else result.skipped += 1;
      } else if (action === "reject_intros") {
        if (bucket === "INTRO_SEGMENT" || bucket === "INTERVIEW") nextStatus = "rejected";
        else result.skipped += 1;
      }

      if (nextStatus) {
        p.status = nextStatus;
        result.updated += 1;
        changed = true;
      }
    }

    if (changed) {
      manifest.generated_at = new Date().toISOString();
      await saveEpisodePerformanceManifest(manifest);
    }
  }

  await rebuildPerformanceIndex();
  return result;
}

export type EnrichedReviewQueue = {
  performances: ClassifiedPerformance[];
  composition: QueueComposition;
  summary: ReturnType<typeof summaryFromComposition>;
  stats: {
    queue_total: number;
    remaining_music_reviews: number;
    accepted_performances: number;
    rejected_segments: number;
    estimated_export_count: number;
  };
};

export async function getEnrichedReviewQueue(
  status: PerformanceStatus = "review",
): Promise<EnrichedReviewQueue> {
  const rows = await listReviewQueue(status);
  const classified = classifyQueue(rows);
  const composition = compositionCounts(classified);
  const index = await loadPerformanceIndex();

  return {
    performances: classified,
    composition,
    summary: summaryFromComposition(composition),
    stats: {
      queue_total: classified.length,
      remaining_music_reviews: composition.MUSIC,
      accepted_performances: index?.stats.accepted ?? 0,
      rejected_segments: index?.stats.rejected ?? 0,
      estimated_export_count: index?.stats.ready_to_export ?? 0,
    },
  };
}

export async function updatePerformanceRecord(
  episodeId: string,
  performanceId: string,
  patch: {
    status?: PerformanceStatus;
    artist?: string;
    song?: string;
    start_seconds?: number;
    end_seconds?: number;
    export_path?: string;
    manually_edited?: boolean;
  },
): Promise<MsPerformanceRecord | null> {
  const manifest = await loadEpisodePerformanceManifest(episodeId);
  if (!manifest) return null;

  const idx = manifest.performances.findIndex((p) => p.performance_id === performanceId);
  if (idx < 0) return null;

  const perf = manifest.performances[idx]!;
  const updated: MsPerformanceRecord = { ...perf, ...patch };
  if (patch.start_seconds != null) {
    updated.start_seconds = patch.start_seconds;
    updated.start_timecode = secToTimecode(patch.start_seconds);
  }
  if (patch.end_seconds != null) {
    updated.end_seconds = patch.end_seconds;
    updated.end_timecode = secToTimecode(patch.end_seconds);
  }
  if (patch.manually_edited) updated.manually_edited = true;

  manifest.performances[idx] = updated;
  await saveEpisodePerformanceManifest(manifest);
  await rebuildPerformanceIndex();
  return updated;
}

/** Adapter: legacy candidate manifest shape for review UI */
export function episodeManifestToCandidateShape(
  manifest: MsEpisodePerformanceManifest,
): MsCandidateManifest {
  const byConfidence: Record<PerformanceConfidence, number> = {
    exact: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const p of manifest.performances) byConfidence[p.confidence] += 1;
  const autoEligible = manifest.performances.filter(
    (p) => p.confidence === "exact" || p.confidence === "high",
  ).length;
  const automation_rate_pct =
    manifest.performances.length > 0
      ? Math.round((autoEligible / manifest.performances.length) * 1000) / 10
      : 0;

  return {
    version: 1,
    collection_id: manifest.collection_id,
    episode_id: manifest.episode_id,
    episode_title: manifest.episode_title,
    air_date: manifest.air_date,
    air_year: manifest.air_year,
    video_path: manifest.video_path,
    generated_at: manifest.generated_at,
    parser_version: manifest.parser_version,
    performances: manifest.performances.map((p) => ({
      id: p.performance_id,
      artist: p.artist,
      song: p.song,
      start_sec: p.start_seconds,
      end_sec: p.end_seconds,
      start_timecode: p.start_timecode,
      end_timecode: p.end_timecode,
      confidence: p.confidence,
      confidence_score: p.confidence_score,
      source: "chapter" as const,
      chapter_title: p.source_chapter,
      chapter_index: p.chapter_index,
      review_status:
        p.status === "accepted" || p.status === "exported"
          ? "accepted"
          : p.status === "rejected"
            ? "rejected"
            : p.manually_edited
              ? "adjusted"
              : "pending",
      export_path: p.export_path,
    })),
    stats: {
      chapter_count: manifest.performances.length,
      performance_count: manifest.performances.length,
      skipped_count: 0,
      by_confidence: byConfidence,
      automation_rate_pct,
    },
  };
}

export async function ensureEpisodePerformances(
  episodeId: string,
  regenerate = false,
): Promise<MsEpisodePerformanceManifest | null> {
  if (!regenerate) {
    const existing = await loadEpisodePerformanceManifest(episodeId);
    if (existing?.performances.length) return existing;
  }
  const built = await buildEpisodeManifest(episodeId);
  if (!built) return null;
  await saveEpisodePerformanceManifest(built);
  await rebuildPerformanceIndex();
  return built;
}

export async function listEpisodeIdsWithPerformances(): Promise<string[]> {
  try {
    const files = await readdir(msPerformanceEpisodesDir());
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export function performancesDataRoot(): string {
  return join(msPerformancesDir());
}
