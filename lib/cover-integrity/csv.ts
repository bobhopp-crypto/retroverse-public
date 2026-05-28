import { escapeCsv } from "@/lib/cover-integrity/csv-utils";
import type { ScoredCoverWithTrust } from "@/lib/cover-integrity/trust-tier";

export { escapeCsv };

export function scoredRowsToCsv(rows: ScoredCoverWithTrust[]): string {
  const headers = [
    "RVAL",
    "artist",
    "album",
    "cover filename",
    "canonical path",
    "trust tier",
    "confidence score",
    "confidence band",
    "suspicion reason",
    "duplicate hash count",
    "file hash",
    "release year",
    "b200 peak",
    "artwork source",
    "review flag",
    "file exists",
    "normalization drift",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.rval,
        r.artist,
        r.album,
        r.coverFilename,
        r.canonicalPath,
        r.trustTier,
        r.confidenceScore,
        r.confidenceBand,
        r.suspicionReasons.join("|"),
        r.duplicateHashCount,
        r.fileHash,
        r.releaseYear,
        r.b200Peak,
        r.artworkSource,
        r.reviewFlag,
        r.fileExists ? "yes" : "no",
        r.normalizationDrift ? "yes" : "no",
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export type ReusedCoverRow = {
  fileHash: string;
  albumCount: number;
  artistCount: number;
  sampleRvals: string;
  sampleArtists: string;
  sampleAlbums: string;
  sameArtistConflict: boolean;
};

export function reusedCoversToCsv(rows: ReusedCoverRow[]): string {
  const headers = [
    "file hash",
    "album count",
    "artist count",
    "same artist conflict",
    "sample RVALs",
    "sample artists",
    "sample albums",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.fileHash,
        r.albumCount,
        r.artistCount,
        r.sameArtistConflict ? "yes" : "no",
        r.sampleRvals,
        r.sampleArtists,
        r.sampleAlbums,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
