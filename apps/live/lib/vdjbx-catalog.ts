import browseCatalog from "./vdjbx-browse-catalog.json";

export const IDLE_ROTATION_MS = 60_000;
export const FRAME_ROTATION_MS = 12_000;

export type VdjbxVideo = {
  videoKey: string;
  title: string;
  artist: string;
  year?: number | null;
  songRvtr?: string | null;
  heroRvtr?: string | null;
  collections?: string[];
  relatedTracks?: VdjbxVideo[];
};

type BrowseCatalog = {
  version: number;
  generatedAt: string;
  items: VdjbxVideo[];
  collections: Array<{ displayName: string; members: string[] }>;
};

const catalog = browseCatalog as BrowseCatalog;

export function loadVdjbxCatalog() {
  return {
    version: catalog.version,
    generatedAt: catalog.generatedAt,
    videos: catalog.items,
    collections: catalog.collections,
  };
}

export function uniquePlaylistVideos(): VdjbxVideo[] {
  const seen = new Set<string>();
  return catalog.items.filter((video) => {
    if (seen.has(video.videoKey)) return false;
    seen.add(video.videoKey);
    return true;
  });
}

export function playlistShelves() {
  const byKey = new Map(catalog.items.map((video) => [video.videoKey, video]));
  return catalog.collections.map((collection) => {
    const seen = new Set<string>();
    const videos = collection.members.flatMap((key) => {
      const video = byKey.get(key);
      if (!video || seen.has(video.videoKey)) return [];
      seen.add(video.videoKey);
      return [video];
    });
    return { displayName: collection.displayName, videos };
  }).filter((shelf) => shelf.videos.length > 0);
}

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function videoForIdentity(artist: string, title: string): VdjbxVideo | null {
  const artistKey = normalize(artist);
  const titleKey = normalize(title);
  return catalog.items.find((video) => normalize(video.artist) === artistKey && normalize(video.title) === titleKey) ?? null;
}

export function videosForRecommendations(video: VdjbxVideo | null): VdjbxVideo[] {
  if (!video) return [];
  const ownCollections = new Set(video.collections ?? []);
  return catalog.items.filter((candidate) => candidate.videoKey !== video.videoKey
    && (candidate.collections ?? []).some((name) => ownCollections.has(name)));
}

export function visualAssetUrl(rvtr: string | null | undefined): string | null {
  if (!rvtr || !/^RVTR\d{6}$/i.test(rvtr)) return null;
  const params = new URLSearchParams({ rvtr: rvtr.toUpperCase(), file: "hero-video.jpg" });
  return `/api/experience/visual-asset?${params.toString()}`;
}

export function vdjbxStillUrl(videoKey: string): string | null {
  const video = catalog.items.find((item) => item.videoKey === videoKey);
  return visualAssetUrl(video?.heroRvtr || video?.songRvtr);
}
