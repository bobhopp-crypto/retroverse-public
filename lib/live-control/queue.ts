import { loadSundayEventSongs } from "@/lib/sunday-nights/load-playlist";
import { loadDeckIndex } from "@/lib/ops/intelligence/deck-index";
import {
  loadSongPackage,
  loadSongPackageIndex,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import type { SongPackageStatus } from "@/lib/ops/intelligence/song-package-types";
import { loadTrackPage } from "@/lib/track/load-track-page";

import type { LiveControlState } from "./types";

const READY_STATUSES = new Set<SongPackageStatus>([
  "cards_ready",
  "approved",
  "published",
]);

type QueueCandidate = {
  rvtr: string;
  year: number | null;
  playCount: number;
  artist: string;
  title: string;
  hasCover: boolean;
  hasDeck: boolean;
  hasSongSheet: boolean;
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function eraYears(era: LiveControlState["era"]): number[] {
  if (era === "1967") return [1967];
  if (era === "1978") return [1978];
  if (era === "1992") return [1992];
  return [1967, 1978, 1992];
}

async function loadSundayNightRvtrs(year: number | null): Promise<string[]> {
  const event = await loadSundayEventSongs(year ? String(year) : "1967");
  const rvtrs = event.songs
    .map((song) => song.rvtr?.trim().toUpperCase() ?? "")
    .filter((rvtr) => /^RVTR\d{6}$/.test(rvtr));
  return [...new Set(rvtrs)];
}

async function enrichCandidate(
  rvtr: string,
  deckSet: Set<string>,
): Promise<QueueCandidate | null> {
  const normalized = normalizePackageRvtr(rvtr);
  if (!normalized) return null;

  const [pkg, track] = await Promise.all([
    loadSongPackage(normalized).catch(() => null),
    loadTrackPage(normalized).catch(() => null),
  ]);

  if (!pkg && !track) return null;

  const coverUrl = pkg?.metadata.coverUrl ?? track?.coverUrl ?? null;
  return {
    rvtr: normalized,
    year: pkg?.metadata.year ?? track?.releaseYear ?? null,
    playCount: pkg?.metadata.playCount ?? 0,
    artist: pkg?.metadata.artist ?? track?.artistName ?? "",
    title: pkg?.metadata.title ?? track?.title ?? normalized,
    hasCover: Boolean(coverUrl?.trim()),
    hasDeck: deckSet.has(normalized),
    hasSongSheet: Boolean(pkg),
  };
}

function applyQualityFilters(
  candidates: QueueCandidate[],
  state: LiveControlState,
): QueueCandidate[] {
  return candidates.filter((candidate) => {
    if (state.hasCover && !candidate.hasCover) return false;
    if (state.hasDeck && !candidate.hasDeck) return false;
    if (state.hasSongSheet && !candidate.hasSongSheet) return false;
    return true;
  });
}

function applySourceFilters(
  candidates: QueueCandidate[],
  state: LiveControlState,
): QueueCandidate[] {
  switch (state.contentSource) {
    case "year":
      if (state.year == null) return candidates;
      return candidates.filter(
        (candidate) =>
          candidate.year != null && Math.abs(candidate.year - state.year!) <= 1,
      );
    case "era": {
      const years = new Set(eraYears(state.era));
      return candidates.filter(
        (candidate) => candidate.year != null && years.has(candidate.year),
      );
    }
    case "artist": {
      const needle = state.artist?.trim().toLowerCase();
      if (!needle) return candidates;
      return candidates.filter((candidate) =>
        candidate.artist.toLowerCase().includes(needle),
      );
    }
    case "top_played":
      return candidates.filter((candidate) => candidate.playCount > 0);
    default:
      return candidates;
  }
}

function applyOrdering(candidates: QueueCandidate[], state: LiveControlState): string[] {
  let ordered = [...candidates];
  switch (state.order) {
    case "most_played":
      ordered.sort((a, b) => b.playCount - a.playCount || a.title.localeCompare(b.title));
      break;
    case "chronological":
      ordered.sort(
        (a, b) =>
          (a.year ?? 9999) - (b.year ?? 9999) ||
          a.artist.localeCompare(b.artist) ||
          a.title.localeCompare(b.title),
      );
      break;
    case "playlist_order":
      break;
    case "random":
    default:
      ordered = shuffle(ordered);
      break;
  }
  return ordered.map((candidate) => candidate.rvtr);
}

export async function buildLiveQueue(state: LiveControlState): Promise<string[]> {
  const [packageIndex, deckIndex] = await Promise.all([
    loadSongPackageIndex(),
    loadDeckIndex(),
  ]);
  const deckSet = new Set(
    deckIndex.decks
      .map((entry) => normalizePackageRvtr(entry.rvtr))
      .filter(Boolean) as string[],
  );

  let seedRvtrs: string[] = [];

  if (state.contentSource === "sunday_nights" || state.mode === "playlist") {
    seedRvtrs = await loadSundayNightRvtrs(state.playlistYear);
  } else if (state.contentSource === "top_played") {
    seedRvtrs = packageIndex.packages.map((entry) => entry.rvtr);
  } else {
    seedRvtrs = packageIndex.packages.map((entry) => entry.rvtr);
  }

  if (state.readyOnly) {
    const ready = new Set(
      packageIndex.packages
        .filter((entry) => READY_STATUSES.has(entry.status))
        .map((entry) => normalizePackageRvtr(entry.rvtr))
        .filter(Boolean) as string[],
    );
    seedRvtrs = seedRvtrs.filter((rvtr) => {
      const normalized = normalizePackageRvtr(rvtr);
      return normalized ? ready.has(normalized) : false;
    });
  }

  seedRvtrs = [...new Set(seedRvtrs.map((rvtr) => normalizePackageRvtr(rvtr) ?? "").filter(Boolean))];

  const enriched = (
    await Promise.all(seedRvtrs.map((rvtr) => enrichCandidate(rvtr, deckSet)))
  ).filter((candidate): candidate is QueueCandidate => candidate != null);

  const filtered = applySourceFilters(applyQualityFilters(enriched, state), state);
  return applyOrdering(filtered, state);
}
