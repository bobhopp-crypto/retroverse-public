import { normVdjPath, type VdjLibraryEntry } from "./vdj-database";
import { resolveRvtrsForVdjLibrary } from "./vdj-rvtr-resolve";
import type { SongPackage } from "./song-package-types";
import { buildVisualProfileFromPackage } from "@/lib/visual-profile/build-visual-profile";
import type { VisualProfileStatus } from "@/lib/visual-profile/types";

export type PackageDiagnostics = {
  rvtr: string;
  canonicalArtist: string;
  canonicalTitle: string;
  vdjArtist: string | null;
  vdjTitle: string | null;
  matchMethod: "path_link" | "title_artist" | "unknown";
  coverPresent: boolean;
  visualStatus: VisualProfileStatus;
  primaryHeroUrl: string | null;
  secondaryHeroUrl: string | null;
};

export async function loadPackageDiagnostics(pkg: SongPackage): Promise<PackageDiagnostics> {
  const snap = pkg.metadata.vdjSnapshot;
  let matchMethod: PackageDiagnostics["matchMethod"] = "unknown";
  let vdjArtist = snap?.artist?.trim() || null;
  let vdjTitle = snap?.title?.trim() || null;

  if (snap?.filePath) {
    const entry: VdjLibraryEntry = {
      filePath: snap.filePath,
      filePathNorm: normVdjPath(snap.filePath),
      artist: snap.artist,
      title: snap.title,
      album: snap.album,
      year: snap.year,
      genre: snap.genre,
      remix: snap.remix,
      label: "",
      user1: snap.user1,
      user2: snap.user2,
      playCount: snap.playCount,
      rating: snap.rating,
      lastPlayed: snap.lastPlayed,
      firstSeen: snap.firstSeen,
      isVideo: snap.isVideo,
    };
    const resolved = await resolveRvtrsForVdjLibrary([entry]);
    const hit = resolved.get(entry.filePathNorm);
    if (hit?.rvtr === pkg.rvtr) matchMethod = hit.method;
  }

  const visualProfile = pkg.visualProfile ?? buildVisualProfileFromPackage(pkg);

  return {
    rvtr: pkg.rvtr,
    canonicalArtist: pkg.metadata.artist,
    canonicalTitle: pkg.metadata.title,
    vdjArtist,
    vdjTitle,
    matchMethod,
    coverPresent: Boolean(pkg.metadata.coverUrl),
    visualStatus: visualProfile.status,
    primaryHeroUrl: visualProfile.primaryHero.url,
    secondaryHeroUrl: visualProfile.secondaryHero.url,
  };
}
