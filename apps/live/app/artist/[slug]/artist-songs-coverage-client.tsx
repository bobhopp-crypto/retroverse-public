"use client";

import type { ChartHistorySongRowData } from "@/lib/songs/chart-history-song-row";

import { ChartHistorySongList } from "@/app/components/chart-history-song-list";

type Props = {
  displayName: string;
  slug: string;
  songs: ChartHistorySongRowData[];
};

export function ArtistSongsCoverageClient({ displayName, slug, songs }: Props) {
  return (
    <ChartHistorySongList
      artistName={displayName}
      artistSlug={slug}
      songs={songs}
      mode="page"
      showSortControls
      defaultSortMode="date"
    />
  );
}
