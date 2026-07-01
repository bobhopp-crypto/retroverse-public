import "server-only";

import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";
import { normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
import { loadPatronSongExperience } from "@/lib/retroverse/experience/load-patron-experience";
import { loadSongControlPackage, songControlData } from "@/lib/retroverse-2/song-control";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";
import { resolveHeroFromSongPackage } from "@/lib/visual-profile/hero-resolver";

import type { HomepageDocumentModel } from "./homepage-document-types";

function trackYear(track: TrackPageData): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

export async function loadHomepageDocument(rvtrParam: string): Promise<HomepageDocumentModel | null> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  const track = await loadTrackPage(rvtr);
  if (!track) return null;

  const controlPackage = await loadSongControlPackage(track);
  if (!isSongExperienceRenderable(controlPackage.status)) return null;

  const pkg = hydratePackageIntel(controlPackage);
  const control = songControlData(controlPackage);
  const year = trackYear(track);
  const hero = resolveHeroFromSongPackage(pkg);

  const patron = await loadPatronSongExperience({
    track,
    pkg,
    control,
    artist: null,
    destination: null,
    releaseYear: year,
    lengthHint: control.facts?.length ?? null,
  });

  return {
    rvtr,
    title: track.title,
    artist: track.artistName,
    year,
    albumTitle: pkg.metadata.albumTitle,
    heroUrl: hero.url,
    coverUrl: track.coverUrl,
    experience: patron.experience,
  };
}
