import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  COLLECTION_SUBDIRS,
  collectionDir,
  collectionJsonPath,
  collectionManifestPath,
  collectionSubdir,
  collectionsIndexPath,
  episodeManifestPath,
  mediaCollectionsRoot,
} from "./paths";
import type {
  CollectionManifest,
  CollectionsIndex,
  EpisodeManifest,
  MediaCollection,
} from "./types";

const NOW = () => new Date().toISOString();

function normalizeCollection(raw: unknown): MediaCollection | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id.trim()) return null;
  return {
    id: r.id.trim(),
    title: typeof r.title === "string" ? r.title : r.id,
    source_type:
      r.source_type === "youtube_playlist" ||
      r.source_type === "internet_archive" ||
      r.source_type === "manual" ||
      r.source_type === "local"
        ? r.source_type
        : "manual",
    source_url: typeof r.source_url === "string" ? r.source_url : "",
    description: typeof r.description === "string" ? r.description : "",
    status:
      r.status === "planned" ||
      r.status === "acquiring" ||
      r.status === "active" ||
      r.status === "complete" ||
      r.status === "paused"
        ? r.status
        : "planned",
    episode_count: typeof r.episode_count === "number" ? r.episode_count : 0,
    downloaded_count: typeof r.downloaded_count === "number" ? r.downloaded_count : 0,
    processed_count: typeof r.processed_count === "number" ? r.processed_count : 0,
    harvested_count: typeof r.harvested_count === "number" ? r.harvested_count : 0,
    created_at: typeof r.created_at === "string" ? r.created_at : NOW(),
    updated_at: typeof r.updated_at === "string" ? r.updated_at : NOW(),
  };
}

export async function ensureMediaCollectionsRoot(): Promise<string> {
  const root = mediaCollectionsRoot();
  await mkdir(root, { recursive: true });
  return root;
}

export async function ensureCollectionDirs(collectionId: string): Promise<string> {
  const dir = collectionDir(collectionId);
  await mkdir(dir, { recursive: true });
  for (const sub of COLLECTION_SUBDIRS) {
    await mkdir(collectionSubdir(collectionId, sub), { recursive: true });
  }
  return dir;
}

export async function loadCollectionsIndex(): Promise<CollectionsIndex> {
  await ensureMediaCollectionsRoot();
  try {
    const raw = JSON.parse(await readFile(collectionsIndexPath(), "utf8")) as unknown;
    if (
      raw &&
      typeof raw === "object" &&
      (raw as CollectionsIndex).version === 1 &&
      Array.isArray((raw as CollectionsIndex).collections)
    ) {
      const collections = (raw as CollectionsIndex).collections
        .map(normalizeCollection)
        .filter((c): c is MediaCollection => c !== null);
      return {
        version: 1,
        collections,
        updated_at:
          typeof (raw as CollectionsIndex).updated_at === "string"
            ? (raw as CollectionsIndex).updated_at
            : NOW(),
      };
    }
  } catch {
    // fall through to empty index
  }
  return { version: 1, collections: [], updated_at: NOW() };
}

export async function saveCollectionsIndex(index: CollectionsIndex): Promise<void> {
  await ensureMediaCollectionsRoot();
  const payload: CollectionsIndex = {
    ...index,
    version: 1,
    updated_at: NOW(),
  };
  await writeFile(collectionsIndexPath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function loadCollection(collectionId: string): Promise<MediaCollection | null> {
  try {
    const raw = JSON.parse(await readFile(collectionJsonPath(collectionId), "utf8")) as unknown;
    return normalizeCollection(raw);
  } catch {
    const index = await loadCollectionsIndex();
    return index.collections.find((c) => c.id === collectionId) ?? null;
  }
}

export async function saveCollection(collection: MediaCollection): Promise<void> {
  await ensureCollectionDirs(collection.id);
  const payload = { ...collection, updated_at: NOW() };
  await writeFile(collectionJsonPath(collection.id), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const index = await loadCollectionsIndex();
  const i = index.collections.findIndex((c) => c.id === collection.id);
  if (i >= 0) {
    index.collections[i] = payload;
  } else {
    index.collections.push(payload);
  }
  await saveCollectionsIndex(index);
}

export function buildCollectionManifest(collection: MediaCollection): CollectionManifest {
  const root = collectionDir(collection.id);
  return {
    version: 1,
    collection,
    storage_root: root,
    paths: {
      episodes: collectionSubdir(collection.id, "episodes"),
      manifests: collectionSubdir(collection.id, "manifests"),
      metadata: collectionSubdir(collection.id, "metadata"),
      descriptions: collectionSubdir(collection.id, "descriptions"),
      transcripts: collectionSubdir(collection.id, "transcripts"),
      downloads: collectionSubdir(collection.id, "downloads"),
    },
  };
}

export async function loadCollectionManifest(
  collectionId: string,
): Promise<CollectionManifest | null> {
  const collection = await loadCollection(collectionId);
  if (!collection) return null;

  try {
    const raw = JSON.parse(
      await readFile(collectionManifestPath(collectionId), "utf8"),
    ) as CollectionManifest;
    if (raw?.version === 1 && raw.collection?.id === collectionId) {
      return {
        ...raw,
        collection,
        storage_root: collectionDir(collectionId),
        paths: buildCollectionManifest(collection).paths,
      };
    }
  } catch {
    // create on the fly
  }

  return buildCollectionManifest(collection);
}

export async function saveCollectionManifest(manifest: CollectionManifest): Promise<void> {
  await ensureCollectionDirs(manifest.collection.id);
  await writeFile(
    collectionManifestPath(manifest.collection.id),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

function normalizeEpisode(raw: unknown, collectionId: string): EpisodeManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id.trim()) return null;

  const downloaded = Boolean(r.downloaded);
  const processed = Boolean(r.processed);
  const harvested = Boolean(r.harvested);

  let status = r.status as EpisodeManifest["status"];
  if (
    status !== "discovered" &&
    status !== "queued" &&
    status !== "downloading" &&
    status !== "downloaded" &&
    status !== "processing" &&
    status !== "processed" &&
    status !== "harvested" &&
    status !== "failed"
  ) {
    status = harvested ? "harvested" : processed ? "processed" : downloaded ? "downloaded" : "discovered";
  }

  return {
    version: 1,
    id: r.id.trim(),
    collection_id: collectionId,
    title: typeof r.title === "string" ? r.title : r.id,
    episode_number: typeof r.episode_number === "string" ? r.episode_number : undefined,
    air_date: typeof r.air_date === "string" ? r.air_date : undefined,
    duration_seconds:
      typeof r.duration_seconds === "number" ? r.duration_seconds : undefined,
    source_url: typeof r.source_url === "string" ? r.source_url : "",
    source_video_id:
      typeof r.source_video_id === "string" ? r.source_video_id : undefined,
    playlist_index:
      typeof r.playlist_index === "number" ? r.playlist_index : undefined,
    status,
    downloaded,
    processed,
    harvested,
    download_path: typeof r.download_path === "string" ? r.download_path : undefined,
    media_lab_job_slug:
      typeof r.media_lab_job_slug === "string" ? r.media_lab_job_slug : undefined,
    media_lab_year: typeof r.media_lab_year === "number" ? r.media_lab_year : undefined,
    discovered_at: typeof r.discovered_at === "string" ? r.discovered_at : NOW(),
    updated_at: typeof r.updated_at === "string" ? r.updated_at : NOW(),
  };
}

export async function loadEpisode(
  collectionId: string,
  episodeId: string,
): Promise<EpisodeManifest | null> {
  try {
    const raw = JSON.parse(
      await readFile(episodeManifestPath(collectionId, episodeId), "utf8"),
    ) as unknown;
    return normalizeEpisode(raw, collectionId);
  } catch {
    return null;
  }
}

export async function saveEpisode(episode: EpisodeManifest): Promise<void> {
  await ensureCollectionDirs(episode.collection_id);
  const payload = { ...episode, version: 1 as const, updated_at: NOW() };
  await writeFile(
    episodeManifestPath(episode.collection_id, episode.id),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

export async function listEpisodes(collectionId: string): Promise<EpisodeManifest[]> {
  const dir = collectionSubdir(collectionId, "episodes");
  let files: string[] = [];
  try {
    const { readdir } = await import("fs/promises");
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const episodes: EpisodeManifest[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(await readFile(join(dir, file), "utf8")) as unknown;
      const ep = normalizeEpisode(raw, collectionId);
      if (ep) episodes.push(ep);
    } catch {
      // skip corrupt manifests
    }
  }

  episodes.sort((a, b) => {
    const ai = a.playlist_index ?? Number.MAX_SAFE_INTEGER;
    const bi = b.playlist_index ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.title.localeCompare(b.title);
  });

  return episodes;
}

export async function syncCollectionCounts(collectionId: string): Promise<MediaCollection | null> {
  const collection = await loadCollection(collectionId);
  if (!collection) return null;

  const episodes = await listEpisodes(collectionId);
  const downloaded_count = episodes.filter((e) => e.downloaded).length;
  const processed_count = episodes.filter((e) => e.processed).length;
  const harvested_count = episodes.filter((e) => e.harvested).length;

  const updated: MediaCollection = {
    ...collection,
    episode_count: episodes.length,
    downloaded_count,
    processed_count,
    harvested_count,
    updated_at: NOW(),
  };

  await saveCollection(updated);
  return updated;
}
