import { defaultRelationships, type PackageRelationships } from "./package-view-model";
import type { SongPackage } from "./song-package-types";

/** Package-only relationships — no live DB queries (page must load instantly). */
export function loadPackageRelationships(pkg: SongPackage): PackageRelationships {
  return {
    ...defaultRelationships(pkg),
    relatedArtists: [{ name: pkg.metadata.artist }],
  };
}
