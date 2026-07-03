import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";
import type { SongControlData } from "@/lib/retroverse-2/song-control";
import type { TrackPageData } from "@/lib/track/load-track-page";

import {
  buildPatronSongExperience,
  buildPublicExhibitFromPatron,
  serializeExperienceCache,
} from "./build-song-experience";
import {
  invalidateSongExperienceCache,
  saveCachedSongExperience,
} from "./experience-cache";
import { savePublicExhibit } from "./public-exhibit-store";

function trackYear(track: TrackPageData): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

async function yearDestination(track: TrackPageData): Promise<RvYearDestination | null> {
  const year = trackYear(track);
  if (!year) return null;
  const history = await loadRvYearChartHistory(year);
  if (!history || !isUsableChartHistory(history)) return null;
  return enrichRvYearDestination(buildRvYearDestination(history, year));
}

/** Rebuild and persist the dynamic exhibit plan after package changes. */
export async function refreshSongExperience(input: {
  track: TrackPageData;
  pkg: SongPackage;
  control?: SongControlData;
}): Promise<void> {
  const { track, pkg, control } = input;
  await invalidateSongExperienceCache(track.rvtr);

  const [artist, destination] = await Promise.all([
    loadArtistPage(track.artistSlug),
    yearDestination(track),
  ]);

  const patron = buildPatronSongExperience({
    track,
    pkg,
    control,
    artist,
    destination,
    releaseYear: trackYear(track),
    lengthHint: control?.facts?.length ?? null,
  });

  await Promise.all([
    saveCachedSongExperience(serializeExperienceCache(patron.experience, patron.living)),
    savePublicExhibit(buildPublicExhibitFromPatron(patron)),
  ]);
}

export async function refreshSongExperienceByRvtr(
  rvtr: string,
  loadTrack: (id: string) => Promise<TrackPageData | null>,
  loadPackage: (track: TrackPageData) => Promise<SongPackage>,
  control?: SongControlData,
): Promise<void> {
  const track = await loadTrack(rvtr);
  if (!track) return;
  const pkg = await loadPackage(track);
  await refreshSongExperience({ track, pkg, control });
}
