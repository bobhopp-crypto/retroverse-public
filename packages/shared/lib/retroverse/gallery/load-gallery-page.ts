import "server-only";

import { loadProductionCandidateRows } from "@/lib/ops/studio/production/load-candidate-rows";
import { resolveActiveLiveRvtr } from "@/lib/live-control/public-entry";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { normalizeRvtr } from "@/lib/studio/status";

import { loadGalleryLibraryProgress, loadGallerySongContext } from "./load-gallery";
import { listGalleryExperiences } from "./experience-registry";
import { serializeGalleryPageData } from "./serialize-gallery-page";
import type { GalleryPageData } from "./gallery-types";
import {
  galleryInstrumentEnabled,
  galleryLog,
  galleryTime,
  galleryTimeEnd,
} from "./gallery-instrument";

export type { GalleryBrowseMode, GalleryPageData } from "./gallery-types";

const DEFAULT_RVTR = "RVTR001341";

export async function loadGalleryPageData(rvtrInput?: string | null): Promise<GalleryPageData | null> {
  const trace = galleryInstrumentEnabled();
  if (trace) {
    galleryLog("[gallery-instrument] loadGalleryPageData ENTER", { rvtrInput });
    galleryTime("[gallery-instrument] loadGalleryPageData total");
  }

  try {
  galleryTime("[gallery-instrument] loadProductionCandidateRows");
  galleryTime("[gallery-instrument] loadSundayNightsState");
  const [candidates, liveState] = await Promise.all([
    loadProductionCandidateRows().finally(() =>
      galleryTimeEnd("[gallery-instrument] loadProductionCandidateRows"),
    ),
    loadSundayNightsState().finally(() =>
      galleryTimeEnd("[gallery-instrument] loadSundayNightsState"),
    ),
  ]);

  if (trace) {
    galleryLog("[gallery-instrument] production candidates loaded", {
      count: candidates.length,
    });
  }

  const liveRvtr = resolveActiveLiveRvtr({
    currentTrackId: liveState.currentTrackId,
    liveRvtr: liveState.live?.rvtr,
  });

  const requested = normalizeRvtr(rvtrInput ?? "") ?? liveRvtr ?? DEFAULT_RVTR;
  const rvtrList = candidates.map((c) => c.rvtr);
  const index = Math.max(0, rvtrList.indexOf(requested));
  const currentRvtr = rvtrList[index] ?? requested;

  if (trace) galleryTime("[gallery-instrument] loadGallerySongContext");
  const song = await loadGallerySongContext(currentRvtr);
  if (trace) galleryTimeEnd("[gallery-instrument] loadGallerySongContext");
  if (!song) return null;

  if (trace) galleryTime("[gallery-instrument] loadGalleryLibraryProgress");
  const [libraryProgress] = await Promise.all([loadGalleryLibraryProgress()]);
  if (trace) galleryTimeEnd("[gallery-instrument] loadGalleryLibraryProgress");

  const prev = index > 0 ? rvtrList[index - 1]! : null;
  const next = index < rvtrList.length - 1 ? rvtrList[index + 1]! : null;
  const randomRvtr =
    rvtrList.length > 1
      ? rvtrList[Math.floor(Math.random() * rvtrList.length)]!
      : rvtrList[0] ?? null;

  const browseModes = [
    { id: "current", label: "Current Song", href: `/retroverse/experiences?rvtr=${currentRvtr}` },
    { id: "artist", label: "Artist", href: `/search?q=${encodeURIComponent(song.artist)}` },
    { id: "album", label: "Album", href: song.album ? `/search?q=${encodeURIComponent(song.album)}` : `/retroverse/experiences?rvtr=${currentRvtr}` },
    { id: "year", label: "Year", href: song.year ? `/rv/${song.year}` : `/retroverse/experiences?rvtr=${currentRvtr}` },
    { id: "genre", label: "Genre", href: `/search` },
    { id: "playlists", label: "Playlists", href: `/search` },
    { id: "top100", label: "Top 100", href: "/charts" },
    { id: "sunday", label: "Sunday Nights", href: "/sunday-nights" },
    { id: "favorites", label: "Favorites", href: `/retroverse/experiences?rvtr=${currentRvtr}` },
  ];

  if (trace) galleryTime("[gallery-instrument] serializeGalleryPageData");
  const result = serializeGalleryPageData({
    currentRvtr,
    song,
    signatureExperiences: listGalleryExperiences("signature"),
    supportingExperiences: listGalleryExperiences("supporting"),
    libraryProgress,
    navigation: {
      previousRvtr: prev,
      nextRvtr: next,
      randomRvtr,
      index: rvtrList.length > 0 ? index : 0,
      total: rvtrList.length,
    },
    browseModes,
    liveRvtr,
  });
  if (trace) galleryTimeEnd("[gallery-instrument] serializeGalleryPageData");

  return result;
  } finally {
    if (trace) {
      galleryTimeEnd("[gallery-instrument] loadGalleryPageData total");
      galleryLog("[gallery-instrument] loadGalleryPageData EXIT");
    }
  }
}
