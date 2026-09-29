import "server-only";

import { cache } from "react";
import { artistFileCode } from "@/lib/artist/slug";
import type { ArtistPageData } from "@/lib/artist/types";
import type { ArtistChartHistoryScope } from "@/lib/artist/load-chart-history";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";
import { loadStaticArtistRecord } from "@/lib/public/static-catalog-pages";
import { loadStaticArtistChartHistory } from "@/lib/artist/static-artist-chart-history";

function fallbackArtistPageData(slugParam: string): ArtistPageData {
  const key = /^\d+$/.test(slugParam.trim()) ? slugParam.trim() : "0";
  const displayName = "Unknown artist";

  return {
    slug: key,
    displayName,
    canonicalName: displayName,
    artistId: 0,
    fileCode: artistFileCode(0, displayName),
    heroImageUrl: null,
    activeRange: "—",
    libraryTracks: 0,
    libraryAlbums: 0,
    essentialAlbums: [],
    signatureTracks: [],
    dominantYears: [],
    chartDecades: [],
    hasDominantYearData: false,
    chartAlbumSpotlight: null,
    chartHighlights: {
      hot100Appearances: 0,
      b200Albums: 0,
      top10Hits: 0,
      top10Albums: 0,
    },
    chartHistory: null,
    relatedArtists: [],
    exploreLinks: key !== "0" ? [{ label: "Artist exhibit", href: `/artist/${key}` }] : [],
  };
}

export type LoadArtistPageOptions = {
  /** Load interactive chart history payload ( `/artist/[slug]/charts` only ). */
  includeChartHistory?: boolean;
  /** `preview` on charts sub-route sample; `full` on /artist/[slug]/charts */
  chartScope?: ArtistChartHistoryScope;
};

async function loadArtistPageImpl(slug: string, options?: LoadArtistPageOptions): Promise<ArtistPageData> {
  const identity = await resolveCanonicalArtist(slug);
  const record = identity ? await loadStaticArtistRecord(identity.rvar) : null;
  if (!record) return fallbackArtistPageData(slug);
  if (options?.includeChartHistory !== true) return record.page;
  const history = await loadStaticArtistChartHistory(identity!.rvar);
  return { ...record.page, chartHistory: history };
}

export const loadArtistPage = cache(loadArtistPageImpl);
