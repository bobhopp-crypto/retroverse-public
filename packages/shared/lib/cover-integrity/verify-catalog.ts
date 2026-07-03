import type { ScoredCoverWithTrust } from "@/lib/cover-integrity/trust-tier";

export type CatalogVerifyTarget = {
  slug: string;
  artistMatch: (artist: string) => boolean;
};

export const CATALOG_VERIFY_TARGETS: CatalogVerifyTarget[] = [
  { slug: "elton-john", artistMatch: (a) => a.toLowerCase().includes("elton john") },
  { slug: "beatles", artistMatch: (a) => /\bbeatles\b/i.test(a) },
  { slug: "fleetwood-mac", artistMatch: (a) => a.toLowerCase().includes("fleetwood mac") },
  { slug: "madonna", artistMatch: (a) => a.toLowerCase().includes("madonna") },
  { slug: "bee-gees", artistMatch: (a) => a.toLowerCase().includes("bee gees") },
];

function isCompilationRow(row: ScoredCoverWithTrust): boolean {
  const t = `${row.album} ${row.artist}`.toLowerCase();
  return /\b(greatest hits|best of|wow hits|compilation|anthology|live)\b/.test(t);
}

export type CatalogVerifyReport = {
  slug: string;
  albumCount: number;
  trusted: number;
  review: number;
  highRisk: number;
  broken: number;
  sameArtistSubstitutions: number;
  sharedHashPairs: number;
};

export function verifyCatalogSlices(rows: ScoredCoverWithTrust[]): {
  artists: CatalogVerifyReport[];
  compilations: { total: number; highRisk: number; review: number };
} {
  const artistReports: CatalogVerifyReport[] = [];

  for (const target of CATALOG_VERIFY_TARGETS) {
    const slice = rows.filter((r) => target.artistMatch(r.artist));
    const hashes = new Map<string, number>();
    for (const r of slice) {
      if (!r.fileHash) continue;
      hashes.set(r.fileHash, (hashes.get(r.fileHash) ?? 0) + 1);
    }
    let sharedHashPairs = 0;
    for (const c of hashes.values()) {
      if (c > 1) sharedHashPairs += 1;
    }

    artistReports.push({
      slug: target.slug,
      albumCount: slice.length,
      trusted: slice.filter((r) => r.trustTier === "TRUSTED").length,
      review: slice.filter((r) => r.trustTier === "REVIEW").length,
      highRisk: slice.filter((r) => r.trustTier === "HIGH_RISK").length,
      broken: slice.filter((r) => r.trustTier === "BROKEN").length,
      sameArtistSubstitutions: slice.filter((r) =>
        r.suspicionReasons.includes("same_artist_different_album_shared_image"),
      ).length,
      sharedHashPairs,
    });
  }

  const comps = rows.filter(isCompilationRow);
  return {
    artists: artistReports,
    compilations: {
      total: comps.length,
      highRisk: comps.filter((r) => r.trustTier === "HIGH_RISK").length,
      review: comps.filter((r) => r.trustTier === "REVIEW").length,
    },
  };
}
