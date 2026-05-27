import "server-only";

import type { HealingApplyPreviousState } from "@/lib/healing/types";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { trackPageHref } from "@/lib/search/entity-routes";
import type { ExhibitPacing, PublicExhibitSnapshot } from "@/lib/healing/continuity-types";
import { inspectQuery } from "@/lib/inspect/pg";

function derivePacing(input: {
  coverVisible: boolean;
  albumCount: number;
}): { pacing: ExhibitPacing; pacingNote: string } {
  if (input.albumCount > 0 && input.coverVisible) {
    return {
      pacing: "coherent",
      pacingNote: "Artist → album shelf → track hero reads as one exhibit path.",
    };
  }
  if (input.albumCount > 0 && !input.coverVisible) {
    return {
      pacing: "partial",
      pacingNote: "Album continuity without hero cover — exhibit feels incomplete.",
    };
  }
  if (!input.albumCount && input.coverVisible) {
    return {
      pacing: "partial",
      pacingNote: "Cover without album shelf — weak album→track continuity.",
    };
  }
  return {
    pacing: "weak",
    pacingNote: "No cover and no albums — degraded orphan exhibit.",
  };
}

/** Live public track page snapshot (what `/track/[id]` would render). */
export async function loadPublicExhibitSnapshot(
  rvtrInput: string,
): Promise<PublicExhibitSnapshot | null> {
  const page = await loadTrackPage(rvtrInput);
  if (!page) return null;

  const coverVisible = Boolean(page.coverUrl);
  const albumCount = page.albums.length;
  const { pacing, pacingNote } = derivePacing({ coverVisible, albumCount });

  return {
    rvtr: page.rvtr,
    title: page.title,
    artistName: page.artistName,
    trackHref: trackPageHref(page.rvtr),
    artistHref: page.artistHref,
    coverVisible,
    albumCount,
    albumLabels: page.albums.map((a) => a.title),
    relatedTrackCount: page.relatedTracks.length,
    chartWeeks: page.chartWeeks,
    peakHot100: page.peakHot100,
    pacing,
    pacingNote,
  };
}

/** Reconstruct pre-heal public surface from apply-time graph snapshot + chart weight. */
export function publicSnapshotFromApplyBefore(
  before: HealingApplyPreviousState,
  meta: {
    chartWeeks: number;
    peakHot100: number | null;
    artistHref: string | null;
  },
): PublicExhibitSnapshot {
  const coverVisible = before.hasCanonicalCover;
  const albumCount = before.albumLinkCount;
  const { pacing, pacingNote } = derivePacing({ coverVisible, albumCount });

  return {
    rvtr: before.rvtr,
    title: before.trackTitle,
    artistName: before.artistName,
    trackHref: trackPageHref(before.rvtr),
    artistHref: meta.artistHref,
    coverVisible,
    albumCount,
    albumLabels: albumCount > 0 ? [`${albumCount} linked (pre-heal)`] : [],
    relatedTrackCount: 0,
    chartWeeks: meta.chartWeeks,
    peakHot100: meta.peakHot100,
    pacing,
    pacingNote,
  };
}

export async function loadTrackChartMeta(rvtr: string): Promise<{
  chartWeeks: number;
  peakHot100: number | null;
  artistHref: string | null;
}> {
  try {
    const rows = await inspectQuery<{
      chart_weeks: number;
      peak_hot100_position: number | null;
      canonical_artist_name: string;
    }>(
      `
      SELECT chart_weeks, peak_hot100_position, canonical_artist_name
      FROM canonical_track_display
      WHERE upper(trim(track_id)) = upper(trim($1))
      LIMIT 1
      `,
      [rvtr],
    );
    const row = rows[0];
    if (!row) {
      return { chartWeeks: 0, peakHot100: null, artistHref: null };
    }
    const page = await loadTrackPage(rvtr);
    return {
      chartWeeks: row.chart_weeks,
      peakHot100: row.peak_hot100_position,
      artistHref: page?.artistHref ?? null,
    };
  } catch {
    return { chartWeeks: 0, peakHot100: null, artistHref: null };
  }
}
