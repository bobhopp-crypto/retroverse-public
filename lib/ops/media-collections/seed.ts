import {
  buildCollectionManifest,
  ensureCollectionDirs,
  ensureMediaCollectionsRoot,
  saveCollection,
  saveCollectionManifest,
  saveCollectionsIndex,
} from "./state";
import type { CollectionsIndex, MediaCollection } from "./types";

const NOW = () => new Date().toISOString();

const STUB_COLLECTIONS: Omit<MediaCollection, "created_at" | "updated_at">[] = [
  {
    id: "live_aid",
    title: "Live Aid",
    source_type: "internet_archive",
    source_url: "",
    description: "Live Aid 1985 — Wembley and JFK dual-venue concert broadcast.",
    status: "planned",
    episode_count: 0,
    downloaded_count: 0,
    processed_count: 0,
    harvested_count: 0,
  },
  {
    id: "woodstock",
    title: "Woodstock",
    source_type: "manual",
    source_url: "",
    description: "Woodstock 1969 — festival performances and documentary sources.",
    status: "planned",
    episode_count: 0,
    downloaded_count: 0,
    processed_count: 0,
    harvested_count: 0,
  },
  {
    id: "billboard_awards",
    title: "Billboard Awards",
    source_type: "youtube_playlist",
    source_url: "",
    description: "Billboard Music Awards broadcasts — year-stamped performance archive.",
    status: "planned",
    episode_count: 0,
    downloaded_count: 0,
    processed_count: 0,
    harvested_count: 0,
  },
  {
    id: "american_bandstand",
    title: "American Bandstand",
    source_type: "youtube_playlist",
    source_url: "",
    description: "American Bandstand — dance floor and performance clips.",
    status: "planned",
    episode_count: 0,
    downloaded_count: 0,
    processed_count: 0,
    harvested_count: 0,
  },
  {
    id: "mtv",
    title: "MTV",
    source_type: "youtube_playlist",
    source_url: "",
    description: "MTV era broadcasts, VMA performances, and specialty blocks.",
    status: "planned",
    episode_count: 0,
    downloaded_count: 0,
    processed_count: 0,
    harvested_count: 0,
  },
  {
    id: "austin_city_limits",
    title: "Austin City Limits",
    source_type: "youtube_playlist",
    source_url: "",
    description: "Austin City Limits — long-running live performance series.",
    status: "planned",
    episode_count: 0,
    downloaded_count: 0,
    processed_count: 0,
    harvested_count: 0,
  },
];

const MIDNIGHT_SPECIAL: Omit<MediaCollection, "created_at" | "updated_at"> = {
  id: "midnight_special",
  title: "Midnight Special",
  source_type: "youtube_playlist",
  source_url: "https://www.youtube.com/playlist?list=PLdQ3g_i8Nrs7wuKdHlnGH6YJfUXgDFBRM",
  description:
    "The Midnight Special (1973–1981) — NBC late-night music series hosted by Burt Sugarman. Official YouTube playlist from @themidnightspecialtvshow.",
  status: "acquiring",
  episode_count: 0,
  downloaded_count: 0,
  processed_count: 0,
  harvested_count: 0,
};

function stamp(collection: Omit<MediaCollection, "created_at" | "updated_at">): MediaCollection {
  const ts = NOW();
  return { ...collection, created_at: ts, updated_at: ts };
}

/** Idempotent seed — creates index, dirs, and collection manifests if missing. */
export async function seedMediaCollections(): Promise<CollectionsIndex> {
  await ensureMediaCollectionsRoot();

  const collections = [stamp(MIDNIGHT_SPECIAL), ...STUB_COLLECTIONS.map(stamp)];

  for (const collection of collections) {
    await ensureCollectionDirs(collection.id);
    await saveCollection(collection);
    await saveCollectionManifest(buildCollectionManifest(collection));
  }

  const index: CollectionsIndex = {
    version: 1,
    collections,
    updated_at: NOW(),
  };
  await saveCollectionsIndex(index);
  return index;
}
