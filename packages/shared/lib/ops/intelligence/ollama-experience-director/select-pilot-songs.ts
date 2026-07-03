import "server-only";

import { computeArtifactReadiness } from "@/lib/ops/intelligence/artifact-readiness";
import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import { auditPackagePriority } from "@/lib/ops/package-priority-audit";
import { loadCoverInfoForRvtrs } from "@/lib/ops/intelligence/load-rvtr-covers";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { loadTrackPage } from "@/lib/track/load-track-page";

import type {
  DirectorDiscoveryCandidate,
  DirectorSongInput,
  PackageQualityTier,
  PilotSelectedSong,
  PilotSelection,
} from "./types";

const PILOT_COUNT = 10;
const STRONG_COUNT = 5;
const WEAK_COUNT = 5;
const CANDIDATE_POOL = 100;

function storyCardCount(tier: PackageQualityTier, count: number, artifactReady: boolean): PackageQualityTier {
  if (count >= 3 && artifactReady) return "strong";
  if (count >= 2) return "strong";
  if (count === 0) return "none";
  return tier;
}

function classifyPackageQuality(input: {
  hasPackage: boolean;
  storyCardCount: number;
  artifactReady: boolean;
  packageStatus: string | null;
}): PackageQualityTier {
  if (!input.hasPackage || input.storyCardCount === 0) return "none";
  if (input.artifactReady || input.storyCardCount >= 3) return "strong";
  if (
    input.storyCardCount >= 1 &&
    (input.packageStatus === "review" ||
      input.packageStatus === "published" ||
      input.packageStatus === "cards_ready" ||
      input.packageStatus === "approved")
  ) {
    return "strong";
  }
  return "weak";
}

function selectionScore(song: PilotSelectedSong): number {
  let score = song.playCount;
  if (song.hasChartHistory) score += 500;
  if (song.hasPackage) score += 200;
  if (song.hasCover) score += 50;
  return score;
}

/** Select 10 pilot songs: high play count, RVTR, mix of strong/weak packages. */
export async function selectPilotSongs(limit = PILOT_COUNT): Promise<PilotSelection> {
  const audit = await auditPackagePriority();
  const pool = audit.rows.slice(0, CANDIDATE_POOL);

  const rvtrs = pool.map((r) => r.rvtr);
  const coverMap = await loadCoverInfoForRvtrs(rvtrs);

  const candidates: PilotSelectedSong[] = [];

  for (const row of pool) {
    const rvtr = row.rvtr.toUpperCase();
    const pkg = await loadSongPackage(rvtr);
    const hydrated = pkg ? hydratePackageIntel(pkg) : null;
    const cards = hydrated?.storyCards.filter((c) => c.rank > 0 && !c.hidden) ?? [];
    const artifactReady = hydrated ? computeArtifactReadiness(hydrated).allReady : false;
    const tier = classifyPackageQuality({
      hasPackage: row.hasPackage,
      storyCardCount: cards.length,
      artifactReady,
      packageStatus: row.packageStatus,
    });

    const track = await loadTrackPage(rvtr);
    candidates.push({
      rvtr,
      title: track?.title ?? row.title,
      artist: track?.artistName ?? row.artist,
      year: track?.releaseYear ?? null,
      album: track?.albums[0]?.title ?? coverMap.get(rvtr)?.albumTitle ?? null,
      playCount: row.playCount,
      packageQualityTier: storyCardCount(tier, cards.length, artifactReady),
      packageStatus: row.packageStatus,
      hasPackage: row.hasPackage,
      hasChartHistory: row.hasChartHistory,
      hasCover: row.hasCover,
      storyCardCount: cards.length,
      filePath: row.filePath,
    });
  }

  candidates.sort((a, b) => selectionScore(b) - selectionScore(a));

  const strong = candidates.filter((c) => c.packageQualityTier === "strong");
  const weak = candidates.filter((c) => c.packageQualityTier === "weak" || c.packageQualityTier === "none");

  const picked: PilotSelectedSong[] = [];
  const used = new Set<string>();

  function take(from: PilotSelectedSong[], n: number) {
    for (const song of from) {
      if (picked.length >= limit) break;
      if (used.has(song.rvtr)) continue;
      picked.push(song);
      used.add(song.rvtr);
      if (--n <= 0) break;
    }
  }

  take(strong, STRONG_COUNT);
  take(weak, WEAK_COUNT);

  if (picked.length < limit) {
    for (const song of candidates) {
      if (picked.length >= limit) break;
      if (used.has(song.rvtr)) continue;
      picked.push(song);
      used.add(song.rvtr);
    }
  }

  return {
    selectedAt: new Date().toISOString(),
    count: picked.length,
    songs: picked.slice(0, limit),
  };
}

function chartSummary(track: Awaited<ReturnType<typeof loadTrackPage>>): string | null {
  if (!track?.hasHot100) return null;
  const parts: string[] = [];
  if (track.peakHot100 != null) parts.push(`Hot 100 peak #${track.peakHot100}`);
  if (track.chartWeeks > 0) parts.push(`${track.chartWeeks} weeks on chart`);
  if (track.firstChartDate) parts.push(`first charted ${track.firstChartDate.slice(0, 10)}`);
  if (track.chartRunLabel) parts.push(track.chartRunLabel);
  return parts.length > 0 ? parts.join("; ") : null;
}

function trajectorySummary(track: Awaited<ReturnType<typeof loadTrackPage>>): string | null {
  const weeks = track?.trajectoryWeeks ?? [];
  if (weeks.length === 0) return null;
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (!first || !last) return `${weeks.length} chart weeks`;
  return `${weeks.length} weeks (#${first.rank} → #${last.rank})`;
}

function buildDiscoveryCandidates(
  track: NonNullable<Awaited<ReturnType<typeof loadTrackPage>>>,
): DirectorDiscoveryCandidate[] {
  const out: DirectorDiscoveryCandidate[] = [];
  for (const rel of track.relatedTracks.slice(0, 8)) {
    out.push({
      kind: "related",
      title: `${rel.title}${rel.peakHot100 != null ? ` (peak #${rel.peakHot100})` : ""}`,
      reason: "chart neighbor / related track",
    });
  }
  for (const album of track.albums.slice(0, 3)) {
    out.push({
      kind: "album",
      title: album.title,
      reason: album.releaseYear ? `released ${album.releaseYear}` : null,
    });
  }
  if (track.artistName) {
    out.push({ kind: "artist", title: track.artistName, reason: "same artist" });
  }
  if (track.releaseYear) {
    out.push({ kind: "year", title: String(track.releaseYear), reason: "release year destination" });
  }
  return out;
}

/** Assemble full director input for one pilot song. */
export async function assembleDirectorInput(song: PilotSelectedSong): Promise<DirectorSongInput> {
  const rvtr = song.rvtr.toUpperCase();
  const [pkg, track, coverMap] = await Promise.all([
    loadSongPackage(rvtr),
    loadTrackPage(rvtr),
    loadCoverInfoForRvtrs([rvtr]),
  ]);

  const hydrated = pkg ? hydratePackageIntel(pkg) : null;
  const artifactReady = hydrated ? computeArtifactReadiness(hydrated).allReady : false;
  const cover = coverMap.get(rvtr);

  const storyCards =
    hydrated?.storyCards
      .filter((c) => c.rank > 0 && !c.hidden)
      .sort((a, b) => a.rank - b.rank)
      .map((c) => ({
        id: c.id,
        rank: c.rank,
        headline: c.headline,
        fact: c.fact,
        category: c.category,
        sourceLabel: c.sourceLabel,
      })) ?? [];

  const candidateFacts =
    hydrated?.candidateFacts
      .filter((f) => f.reviewStatus !== "rejected" && !f.mergedIntoId)
      .slice(0, 25)
      .map((f) => ({
        id: f.id,
        factText: f.factText,
        category: f.category,
        reviewStatus: f.reviewStatus,
        confidence: f.confidence,
      })) ?? [];

  const timelineEvents =
    hydrated?.intel.timelineEvents.map((e) => ({
      year: e.year,
      title: e.title,
      description: e.description,
    })) ?? [];

  return {
    rvtr,
    title: track?.title ?? song.title,
    artist: track?.artistName ?? song.artist,
    year: track?.releaseYear ?? song.year,
    album: track?.albums[0]?.title ?? song.album,
    playCount: song.playCount,
    chartHistorySummary: chartSummary(track),
    trajectorySummary: trajectorySummary(track),
    storyCards,
    candidateFacts,
    timelineEvents,
    discoveryCandidates: track ? buildDiscoveryCandidates(track) : [],
    coverStatus: {
      hasCover: Boolean(cover?.coverUrl ?? track?.coverUrl),
      albumTitle: cover?.albumTitle ?? track?.albums[0]?.title ?? null,
    },
    videoStatus: {
      hasOwnedVideo: Boolean(song.filePath),
      hasVdjMedia: track?.hasVdjMedia ?? false,
      filePath: song.filePath,
    },
    packageStatus: {
      status: hydrated?.status ?? song.packageStatus,
      storyCardCount: storyCards.length,
      artifactReady,
      packageQualityTier: song.packageQualityTier,
    },
  };
}
