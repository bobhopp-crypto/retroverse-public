import type { ArtistPageData } from "@/lib/artist/types";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";
import type { SongControlData } from "@/lib/retroverse-2/song-control";
import type { TrackPageData } from "@/lib/track/load-track-page";
import { resolveSongEraExhibit } from "@/lib/retroverse/rvbr/song-era-exhibit";

import {
  buildPatronSongExperience,
  type PatronSongExperience,
} from "./build-song-experience";
import { hydratePublicExhibit, isPublicExhibitFresh } from "./hydrate-public-exhibit";
import { loadPublicExhibit } from "./public-exhibit-store";

/** Load precomputed exhibit when available; otherwise build at request time. */
export async function loadPatronSongExperience(input: {
  track: TrackPageData;
  pkg: SongPackage;
  control?: SongControlData;
  artist: ArtistPageData | null;
  destination: RvYearDestination | null;
  releaseYear: number | null;
  lengthHint?: string | null;
}): Promise<PatronSongExperience> {
  const cached = await loadPublicExhibit(input.track.rvtr);
  if (isPublicExhibitFresh(cached, input.pkg.updatedAt ?? null)) {
    const hydrated = hydratePublicExhibit(cached!, input.track);
    return {
      experience: hydrated.experience,
      living: hydrated.living,
      eraExhibit: cached!.eraExhibit,
    };
  }

  return buildPatronSongExperience(input);
}
