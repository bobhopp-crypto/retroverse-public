import { coverPathToUrl } from "@/lib/artist/cover-url";
import { artistSlugFromName } from "@/lib/cover-integrity/normalize";
import { slugFromNormalizedLabel } from "@/lib/search/normalize-search-label";
import { defaultCoverFsRoot, resolveCoverFilePath } from "@/lib/cover-integrity/score";
import type { ScoredCoverWithTrust } from "@/lib/cover-integrity/trust-tier";

export type ArtworkLinkCandidate = {
  rval: string;
  canonicalCoverPath: string | null;
  r2CoverKey: string | null;
  source: string | null;
  confidenceScore: number | null;
  reviewFlag: string | null;
};

export type ProposedCoverCandidate = {
  proposedSource: string;
  proposedCoverUrlOrPath: string;
  proposedConfidence: number;
  proposedReason: string;
};

export function buildDiscogsSearchUrl(
  artist: string,
  album: string,
  releaseYear: number | null,
): string {
  const parts = [artist.trim(), album.trim()];
  if (releaseYear != null) parts.push(String(releaseYear));
  const q = encodeURIComponent(parts.join(" "));
  return `https://www.discogs.com/search/?q=${q}&type=release`;
}

function expectedCanonicalRelPath(
  rval: string,
  artist: string,
  album: string,
): string {
  const artistSlug = artistSlugFromName(artist);
  const albumSlug = slugFromNormalizedLabel(album);
  return `retroverse/covers/${rval}/${rval}__${artistSlug}__${albumSlug}.jpg`;
}

export function proposeReplacementCandidate(
  row: ScoredCoverWithTrust,
  allRows: ScoredCoverWithTrust[],
  artworkLinks: ArtworkLinkCandidate[],
): ProposedCoverCandidate {
  const currentPath = row.canonicalPath?.trim() || "";
  const currentHash = row.fileHash;
  const rowLinks = artworkLinks.filter((l) => l.rval === row.rval);

  for (const link of rowLinks) {
    const path = link.canonicalCoverPath?.trim();
    if (!path || path === currentPath) continue;
    const src = (link.source || "").toLowerCase();
    if (src.includes("discogs")) {
      return {
        proposedSource: "discogs_artwork_link",
        proposedCoverUrlOrPath: coverPathToUrl(path, link.r2CoverKey) ?? path,
        proposedConfidence: 78,
        proposedReason: "Alternate album_artwork_links row tagged discogs with distinct path",
      };
    }
    return {
      proposedSource: "artwork_link_alternate",
      proposedCoverUrlOrPath: coverPathToUrl(path, link.r2CoverKey) ?? path,
      proposedConfidence: 68,
      proposedReason: "Alternate album_artwork_links path not equal to current canonical",
    };
  }

  const trustedPeer = allRows.find(
    (r) =>
      r.rval !== row.rval &&
      r.trustTier === "TRUSTED" &&
      r.artistKey === row.artistKey &&
      r.titleKeyAlbum === row.titleKeyAlbum &&
      r.fileHash &&
      r.fileHash !== currentHash &&
      r.canonicalPath,
  );
  if (trustedPeer?.canonicalPath) {
    return {
      proposedSource: "trusted_peer_rval",
      proposedCoverUrlOrPath:
        coverPathToUrl(trustedPeer.canonicalPath, null) ?? trustedPeer.canonicalPath,
      proposedConfidence: 85,
      proposedReason: `TRUSTED peer ${trustedPeer.rval} exact normalized artist+album with distinct hash`,
    };
  }

  if (!row.fileExists || row.suspicionReasons.includes("file_missing_on_disk")) {
    const expected = expectedCanonicalRelPath(row.rval, row.artist, row.album);
    const fsRoot = defaultCoverFsRoot();
    const abs = resolveCoverFilePath(fsRoot, expected);
    return {
      proposedSource: "filesystem_slot_plus_discogs",
      proposedCoverUrlOrPath: buildDiscogsSearchUrl(row.artist, row.album, row.releaseYear),
      proposedConfidence: 52,
      proposedReason: `Expected slot ${expected} missing on disk (${abs ?? expected}); use Discogs search to source bytes`,
    };
  }

  if (row.suspicionReasons.includes("same_artist_different_album_shared_image")) {
    const conflictPeer = allRows.find(
      (r) =>
        r.rval !== row.rval &&
        r.artistKey === row.artistKey &&
        r.fileHash === currentHash &&
        r.titleKeyAlbum !== row.titleKeyAlbum,
    );
    const peerNote = conflictPeer
      ? `; conflicts with ${conflictPeer.rval} "${conflictPeer.album}"`
      : "";
    return {
      proposedSource: "discogs_search",
      proposedCoverUrlOrPath: buildDiscogsSearchUrl(row.artist, row.album, row.releaseYear),
      proposedConfidence: 55,
      proposedReason: `Same-artist byte collision — surgical re-pull required (exact title+year+artist)${peerNote}`,
    };
  }

  if (row.normalizationDrift || row.suspicionReasons.includes("album_title_filename_mismatch")) {
    const expected = expectedCanonicalRelPath(row.rval, row.artist, row.album);
    return {
      proposedSource: "filename_slot_discogs",
      proposedCoverUrlOrPath: buildDiscogsSearchUrl(row.artist, row.album, row.releaseYear),
      proposedConfidence: 50,
      proposedReason: `Filename/title drift — target slot ${expected} + Discogs metadata match`,
    };
  }

  return {
    proposedSource: "discogs_search",
    proposedCoverUrlOrPath: buildDiscogsSearchUrl(row.artist, row.album, row.releaseYear),
    proposedConfidence: 45,
    proposedReason: "No TRUSTED peer or alternate link; human curator Discogs release match",
  };
}

export function localCoverFileUrl(canonicalPath: string | null): string | null {
  if (!canonicalPath?.trim()) return null;
  const abs = resolveCoverFilePath(defaultCoverFsRoot(), canonicalPath);
  if (!abs) return null;
  return `file://${abs}`;
}

export function isCompilationCluster(row: ScoredCoverWithTrust): boolean {
  if (row.duplicateHashCount < 14) return false;
  const blob = `${row.artist} ${row.album}`.toLowerCase();
  return (
    blob.includes("various") ||
    /\bnow\s*\d/.test(blob) ||
    blob.includes("wow hits")
  );
}

export function isPriorityArtist(artist: string): boolean {
  const a = artist.toLowerCase();
  return (
    a.includes("elton john") ||
    /\bbeatles\b/.test(a) ||
    a.includes("fleetwood mac") ||
    a.includes("madonna") ||
    a.includes("bee gees")
  );
}

/** Force-include RVALs for batch 001 spot checks. */
export const BATCH_001_MANDATORY_RVALS = new Set([
  "RVAL823723",
  "RVAL303430",
  "RVAL768327",
  "RVAL510721",
  "RVAL495007",
  "RVAL024009",
  "RVAL039655",
]);
