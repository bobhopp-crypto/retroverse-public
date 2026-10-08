import { ArtistMagazine } from "@/app/artist/[slug]/artist-magazine";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import {
  composeArtistMagazine,
  type MagazineAlbumInput,
  type MagazineSongInput,
} from "@/lib/artist/compose-artist-magazine";
import type { ArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import type { ArtistPageData } from "@/lib/artist/types";

type Props = {
  data: ArtistPageData;
  coverage: ArtistCoverageSummary;
  /** Companion stills beside VIDEO, keyed by RVTR. Album covers stay the fallback. */
  stillByRvtr?: ReadonlyMap<string, string>;
};

const RVAL = /^RVAL\d{6}$/i;

function albumHref(rval: string | null): string | null {
  if (!rval || !RVAL.test(rval)) return null;
  return `/album/${rval.toUpperCase()}`;
}

export function ArtistPageView({ data, coverage, stillByRvtr }: Props) {
  const coverByTrack = new Map(
    data.signatureTracks
      .filter((track) => track.coverUrl)
      .map((track) => [track.rvtr.toUpperCase(), track.coverUrl!] as const),
  );

  const songs: MagazineSongInput[] = coverage.songs
    .filter((song) => song.title.trim())
    .map((song) => {
      const key = song.rvtr.toUpperCase();
      const still = stillByRvtr?.get(key) ?? null;
      const cover = coverByTrack.get(key) ?? null;
      return {
        id: key,
        title: song.title.trim(),
        year: song.firstChartYear,
        peak: song.peakHot100,
        variant: null,
        href: song.trackHref,
        images: [still, cover].filter((src): src is string => Boolean(src)),
        quotes: [],
        owned: song.coverageStatus === "owned",
        albumTitle: null,
      };
    });

  const albums: MagazineAlbumInput[] = data.essentialAlbums
    .filter((album) => album.title.trim())
    .map((album) => ({
      id: album.rval ?? `${album.title}-${album.releaseYear ?? "undated"}`,
      title: album.title.trim(),
      year: album.releaseYear,
      href: albumHref(album.rval),
      coverUrl: album.coverUrl,
    }));

  const page = composeArtistMagazine({
    name: data.displayName,
    heroImageUrl: data.heroImageUrl,
    songs,
    albums,
    profile: null,
  });

  return (
    <Rv2PublicShell className="rv2-artist rv2-magazine" broadcastChrome={false} showTopBroadcastBanner={false}>
      <ArtistMagazine page={page} />
    </Rv2PublicShell>
  );
}
