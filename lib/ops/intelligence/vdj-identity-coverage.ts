import {
  loadDirectRvtrPathIndex,
  loadMediaAssetIndex,
  loadTitleArtistIndex,
  resolveVideoIdentity,
  type VideoIdentityResult,
} from "./video-identification";
import { scanVdjDatabase, type VdjLibraryEntry } from "./vdj-database";

export type VdjIdentityMatch = {
  entry: VdjLibraryEntry;
  identity: VideoIdentityResult;
  rvtr: string;
};

export type VdjIdentityCoverage = {
  scannedAt: string;
  vdjDatabasePath: string;
  totalVdjTracks: number;
  totalVdjVideoTracks: number;
  distinctRvtrs: number;
  mappedVdjTracks: number;
  unresolvedTracks: number;
  coveragePct: number;
  averageVdjFilesPerRvtr: number;
  topRvtrsByFileCount: Array<{
    rvtr: string;
    fileCount: number;
    examples: Array<{ artist: string; title: string; filePath: string; isVideo: boolean }>;
  }>;
  matches: VdjIdentityMatch[];
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export async function loadVdjIdentityCoverage(options?: { force?: boolean }): Promise<VdjIdentityCoverage> {
  const scan = await scanVdjDatabase({ force: options?.force });
  const [mediaIndex, directRvtrByPath, titleArtist] = await Promise.all([
    loadMediaAssetIndex(),
    loadDirectRvtrPathIndex(),
    loadTitleArtistIndex(),
  ]);

  const matches: VdjIdentityMatch[] = [];
  const byRvtr = new Map<string, VdjIdentityMatch[]>();

  for (const entry of scan.entries) {
    const identity = resolveVideoIdentity(
      entry,
      mediaIndex,
      directRvtrByPath,
      titleArtist.byTitleArtist,
      titleArtist.coverByRvtr,
    );
    if (!identity.rvtr) continue;

    const match = { entry, identity, rvtr: identity.rvtr };
    matches.push(match);
    const existing = byRvtr.get(identity.rvtr) ?? [];
    existing.push(match);
    byRvtr.set(identity.rvtr, existing);
  }

  const topRvtrsByFileCount = [...byRvtr.entries()]
    .map(([rvtr, rvtrMatches]) => ({
      rvtr,
      fileCount: rvtrMatches.length,
      examples: rvtrMatches.slice(0, 5).map(({ entry }) => ({
        artist: entry.artist,
        title: entry.title,
        filePath: entry.filePath,
        isVideo: entry.isVideo,
      })),
    }))
    .sort((a, b) => b.fileCount - a.fileCount || a.rvtr.localeCompare(b.rvtr))
    .slice(0, 25);

  return {
    scannedAt: scan.scannedAt,
    vdjDatabasePath: scan.path,
    totalVdjTracks: scan.entries.length,
    totalVdjVideoTracks: scan.entries.filter((entry) => entry.isVideo).length,
    distinctRvtrs: byRvtr.size,
    mappedVdjTracks: matches.length,
    unresolvedTracks: scan.entries.length - matches.length,
    coveragePct: pct(matches.length, scan.entries.length),
    averageVdjFilesPerRvtr: byRvtr.size > 0 ? Number((matches.length / byRvtr.size).toFixed(2)) : 0,
    topRvtrsByFileCount,
    matches,
  };
}
