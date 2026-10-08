import { ArtistMagazine } from "@/app/artist/[slug]/artist-magazine";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import {
  composeArtistMagazine,
  type MagazineAlbumInput,
  type MagazineProfile,
  type MagazineSongInput,
} from "@/lib/artist/compose-artist-magazine";
import type { ArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import type { ArtistPageData } from "@/lib/artist/types";
import type { ArtistProfileView } from "@/lib/artist-profile-contract";
import { albumSuggestionHref, trackPageHref } from "@/lib/search/entity-routes";

type Props = {
  data: ArtistPageData;
  coverage: ArtistCoverageSummary;
  /** Companion stills beside VIDEO, keyed by RVTR. Album covers stay the fallback. */
  stillByRvtr?: ReadonlyMap<string, string>;
  profile?: ArtistProfileView | null;
};

const RVAL = /^RVAL\d{6}$/i;

function albumHref(rval: string | null): string | null {
  if (!rval || !RVAL.test(rval)) return null;
  return `/album/${rval.toUpperCase()}`;
}

function withProfileQuotes(songs: MagazineSongInput[], profile: ArtistProfileView | null | undefined): MagazineSongInput[] {
  if (!profile) return songs;
  const byId = new Map(profile.songs.filter((song) => song.note).map((song) => [song.rvtr.toUpperCase(), song.note!] as const));
  const byTitle = new Map(profile.songs.filter((song) => song.note).map((song) => [song.title.trim().toLowerCase(), song.note!] as const));
  return songs.map((song) => {
    if (song.quotes.length > 0) return song;
    const note = byId.get(song.id) ?? byTitle.get(song.title.trim().toLowerCase());
    return note ? { ...song, quotes: [note] } : song;
  });
}

function curatorProfile(profile: ArtistProfileView, songs: MagazineSongInput[]): MagazineProfile {
  const placedNotes = new Set(songs.flatMap((song) => song.quotes));
  const records = [
    ...profile.songs
      .filter((song) => song.note && !placedNotes.has(song.note))
      .map((song) => ({
        key: song.rvtr,
        title: song.title,
        text: song.note!,
        href: trackPageHref(song.rvtr),
      })),
    ...profile.albums
      .filter((album) => album.note)
      .map((album) => ({
        key: album.rval,
        title: album.title,
        text: album.note!,
        href: albumSuggestionHref(album.title, `/album/${album.rval}`),
      })),
  ];
  const screen = profile.videos
    .filter((video) => video.title.trim())
    .map((video) => ({
      key: video.videoKey,
      title: video.title,
      text: [video.kind, video.note].filter(Boolean).join(" — "),
      href: null,
    }));
  const worth = [...profile.discoveries, ...profile.chartNotes, ...profile.connections].map((text, index) => ({
    key: `worth-${index}`,
    title: null,
    text,
    href: null,
  }));
  const notes = [
    screen.length ? { heading: "On screen", items: screen } : null,
    records.length ? { heading: "Records worth knowing", items: records } : null,
    worth.length ? { heading: "Worth knowing", items: worth } : null,
  ].filter((group): group is NonNullable<typeof group> => Boolean(group));

  return {
    summary: profile.summary,
    descriptor: null,
    story: profile.story,
    chronology: profile.chronology,
    artistQuotes: [],
    credits: [],
    portraitUrl: profile.portraitUrl,
    notes,
  };
}

export function ArtistPageView({ data, coverage, stillByRvtr, profile = null }: Props) {
  const coverByTrack = new Map(
    data.signatureTracks
      .filter((track) => track.coverUrl)
      .map((track) => [track.rvtr.toUpperCase(), track.coverUrl!] as const),
  );

  const songs = withProfileQuotes(
    coverage.songs
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
        } satisfies MagazineSongInput;
      }),
    profile,
  );

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
    profile: profile ? curatorProfile(profile, songs) : null,
  });

  return (
    <Rv2PublicShell className="rv2-artist rv2-magazine" broadcastChrome={false} showTopBroadcastBanner={false}>
      <ArtistMagazine page={page} />
    </Rv2PublicShell>
  );
}
