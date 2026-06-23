import {
  createEmptySongPackage,
  loadSongPackage,
  saveSongPackage,
} from "@/lib/ops/intelligence/song-package-store";
import type { SongPackage, SongPackageMetadata } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";

export type SongStoryFields = {
  aboutSong: string;
  aboutArtist: string;
  theYear: string;
  exploreFurther: string;
};

export type SongFactFields = {
  peakPosition: string;
  length: string;
  label: string;
  releaseDate: string;
};

export type SongLocks = {
  cover: boolean;
  year: boolean;
  album: boolean;
  storyContent: boolean;
};

export type SongControlData = {
  story: Partial<SongStoryFields>;
  facts: Partial<SongFactFields>;
  locks: Partial<SongLocks>;
};

export type SongControlPackage = SongPackage & {
  retroverse2?: Partial<SongControlData>;
};

export function packageMetadataFromTrack(track: TrackPageData): SongPackageMetadata {
  return {
    rvtr: track.rvtr,
    artist: track.artistName,
    title: track.title,
    year: track.releaseYear,
    albumTitle: track.albums[0]?.title ?? null,
    coverUrl: track.coverUrl,
    peakHot100: track.peakHot100,
    chartWeeks: track.chartWeeks || null,
    playCount: null,
    tags: [],
    hasVdjMedia: track.hasVdjMedia,
    videoInfo: null,
    relatedArtists: [],
  };
}

export async function loadSongControlPackage(
  track: TrackPageData,
): Promise<SongControlPackage> {
  const existing = (await loadSongPackage(track.rvtr)) as SongControlPackage | null;
  if (existing) return existing;
  return createEmptySongPackage(packageMetadataFromTrack(track)) as SongControlPackage;
}

export async function saveSongControlPackage(pkg: SongControlPackage): Promise<SongControlPackage> {
  return (await saveSongPackage(pkg)) as SongControlPackage;
}

export function songControlData(pkg: SongControlPackage | null): SongControlData {
  return {
    story: pkg?.retroverse2?.story ?? {},
    facts: pkg?.retroverse2?.facts ?? {},
    locks: pkg?.retroverse2?.locks ?? {},
  };
}

export function mergeSongControl(
  pkg: SongControlPackage,
  patch: Partial<SongControlData>,
): SongControlPackage {
  return {
    ...pkg,
    retroverse2: {
      ...pkg.retroverse2,
      story: { ...(pkg.retroverse2?.story ?? {}), ...(patch.story ?? {}) },
      facts: { ...(pkg.retroverse2?.facts ?? {}), ...(patch.facts ?? {}) },
      locks: { ...(pkg.retroverse2?.locks ?? {}), ...(patch.locks ?? {}) },
    },
  };
}
