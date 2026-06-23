import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveChannelFollower } from "@/components/live-channel/LiveChannelFollower";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadArtistPage } from "@/lib/artist/load-artist-page";
import type { ArtistPageData } from "@/lib/artist/types";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import { loadSongControlPackage, songControlData, type SongControlData } from "@/lib/retroverse-2/song-control";
import { resolveTrackPlayback } from "@/lib/playback/resolve-track-playback";
import { trackPageHref } from "@/lib/search/entity-routes";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";

import { RetroverseSong2Tabs, type Song2Fact, type Song2Item, type Song2Section, type Song2Tab } from "./retroverse-song-2-tabs";

import "./retroverse-song-2.css";

type Props = {
  params: Promise<{ rvtr: string }>;
};

type CulturalMoment = {
  title: string;
  meta: string | null;
  href: string | null;
  coverUrl: string | null;
  copy?: string | null;
};

const TAB_LABELS: Record<Song2Tab["id"], string> = {
  overview: "Overview",
  story: "Story",
  artist: "Artist",
  culture: "Culture",
  media: "Media",
  timeline: "Timeline",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const track = await loadTrackPage(rvtr);
  return {
    title: track ? `${track.title} — Retroverse 2.0` : "Song — Retroverse 2.0",
    description: track
      ? `${track.title} by ${track.artistName}: story, artist, culture, media, and timeline.`
      : undefined,
  };
}

function compactDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function firstAlbum(track: TrackPageData) {
  return track.albums.find((album) => album.title) ?? null;
}

function isAmericanPie(track: TrackPageData): boolean {
  return track.rvtr.toUpperCase() === "RVTR891825";
}

function titleCaseName(name: string): string {
  return name.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function trackYear(track: TrackPageData): number | null {
  if (track.releaseYear) return track.releaseYear;
  const firstChartYear = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(firstChartYear) && firstChartYear > 0) return firstChartYear;
  const albumYear = firstAlbum(track)?.releaseYear ?? null;
  return albumYear;
}

function section(
  eyebrow: string,
  title: string,
  options: {
    copy?: string | null;
    facts?: (Song2Fact | null)[];
    items?: (Song2Item | null)[];
  },
): Song2Section | null {
  const facts = (options.facts ?? []).filter((fact): fact is Song2Fact => fact != null);
  const items = (options.items ?? []).filter((item): item is Song2Item => item != null);
  if (!options.copy && facts.length === 0 && items.length === 0) return null;
  return {
    eyebrow,
    title,
    copy: options.copy,
    facts,
    items,
  };
}

async function yearDestination(track: TrackPageData): Promise<RvYearDestination | null> {
  const year = trackYear(track);
  if (!year) return null;
  const history = await loadRvYearChartHistory(year);
  if (!history || !isUsableChartHistory(history)) return null;
  return enrichRvYearDestination(buildRvYearDestination(history, year));
}

function aboutSongCopy(track: TrackPageData, control?: SongControlData): string | null {
  if (control?.story.aboutSong?.trim()) return control.story.aboutSong.trim();

  if (isAmericanPie(track)) {
    return "A long-form ballad that turned rock history into myth, using the 1959 plane crash that killed Buddy Holly, Ritchie Valens, and the Big Bopper as its emotional center.";
  }

  const album = firstAlbum(track);
  const facts = [
    track.peakHot100
      ? `Reached #${track.peakHot100} on the Hot 100`
      : null,
    track.chartWeeks > 0 ? `Charted for ${track.chartWeeks} weeks` : null,
    album?.title ? `Album: ${album.title}` : null,
  ].filter(Boolean);
  if (facts.length === 0) return null;
  return facts.join(", ") + ".";
}

function heroFacts(track: TrackPageData): Song2Fact[] {
  const album = firstAlbum(track);
  const year = trackYear(track);
  if (isAmericanPie(track)) {
    return [
      { label: "Peak Chart Position", value: "#1" },
      { label: "Year", value: String(year ?? 1971) },
      { label: "Length", value: "8:42" },
      { label: "Label", value: "United Artists" },
    ];
  }

  return [
    track.peakHot100 ? { label: "Peak Chart Position", value: `#${track.peakHot100}` } : null,
    year ? { label: "Year", value: String(year) } : null,
    album?.title ? { label: "Album", value: album.title } : null,
  ].filter((fact): fact is Song2Fact => fact != null);
}

function culturalMoments(
  track: TrackPageData,
  artist: ArtistPageData,
  destination: RvYearDestination | null,
): CulturalMoment[] {
  if (isAmericanPie(track)) {
    const byTitle = new Map(
      [
        ...(destination?.definingSongs ?? []).map((song) => [song.title.toLowerCase(), song.coverUrl] as const),
        ...artist.essentialAlbums.map((album) => [album.title.toLowerCase(), album.coverUrl] as const),
      ],
    );

    return [
      {
        title: "The Day The Music Died",
        meta: "Buddy Holly, Ritchie Valens, The Big Bopper",
        href: "/search?q=Buddy%20Holly%20Ritchie%20Valens%20Big%20Bopper",
        coverUrl: null,
        copy: "The song turns a 1959 tragedy into a symbol for lost innocence in rock and roll.",
      },
      {
        title: "Tapestry",
        meta: "Carole King",
        href: "/search?q=Carole%20King%20Tapestry",
        coverUrl: byTitle.get("tapestry") ?? null,
        copy: "1971 was also the singer-songwriter moment, where personal writing became pop culture.",
      },
      {
        title: "What's Going On",
        meta: "Marvin Gaye",
        href: "/search?q=Marvin%20Gaye%20What%27s%20Going%20On",
        coverUrl: byTitle.get("what's going on") ?? null,
        copy: "The year carried songs that treated pop music as a place for grief, politics, and reflection.",
      },
      {
        title: "Imagine",
        meta: "John Lennon",
        href: "/search?q=John%20Lennon%20Imagine",
        coverUrl: byTitle.get("imagine") ?? null,
        copy: "American Pie belongs to a period when pop songs were expected to carry big public feelings.",
      },
    ];
  }

  const album = firstAlbum(track);
  const candidates: (CulturalMoment | null)[] = [
    ...(destination?.definingSongs.slice(0, 4).map((song) => ({
      title: song.title,
      meta: titleCaseName(song.artist),
      href: song.href,
      coverUrl: song.coverUrl,
    })) ?? []),
    ...(destination?.definingArtists.slice(0, 3).map((entry) => ({
      title: titleCaseName(entry.name),
      meta: "Artist",
      href: entry.href,
      coverUrl: null,
    })) ?? []),
    ...artist.essentialAlbums.slice(0, 3).map((entry) => ({
      title: entry.title,
      meta: entry.releaseYear ? String(entry.releaseYear) : "Album",
      href: entry.rval ? `/album/${entry.rval}` : null,
      coverUrl: entry.coverUrl,
    })),
    album
      ? {
          title: album.title,
          meta: album.releaseYear ? String(album.releaseYear) : "Album",
          href: album.href,
          coverUrl: album.coverUrl,
        }
      : null,
  ];
  const moments = candidates.filter((item): item is CulturalMoment => item != null);

  const seen = new Set<string>();
  return moments
    .filter((moment) => {
      const key = `${moment.title.toLowerCase()}|${moment.meta ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function overviewSections(track: TrackPageData, artist: ArtistPageData, control?: SongControlData): Song2Section[] {
  if (isAmericanPie(track)) {
    return [
      section("Overview", "Why This Song Matters", {
        copy: control?.story.aboutSong?.trim() || "American Pie became culturally significant because it made rock history feel like shared memory. It names the loss behind “the day the music died,” then stretches that grief into a larger story about the end of 1950s innocence and the turbulence that followed.",
        facts: [
          { label: "Peak", value: "#1" },
          { label: "Length", value: "8:42" },
          { label: "Theme", value: "Rock memory" },
        ],
      }),
      section("Overview", "About The Artist", {
        copy: control?.story.aboutArtist?.trim() || "Don McLean matters because he proved a folk-rooted singer-songwriter could make a long, literary song into a popular event. American Pie became his signature, while Vincent showed the same gift for turning biography and emotion into song.",
        items: [
          { label: "Vincent", href: "/search?q=Don%20McLean%20Vincent", meta: "Next song" },
          { label: "Don McLean", href: track.artistHref, meta: "Artist" },
        ],
      }),
      section("Overview", "The Year", {
        copy: control?.story.theYear?.trim() || "1971 was a hinge year: the optimism of the 1960s had curdled, Vietnam was still in the background, and singer-songwriters were turning private memory into public language. American Pie fit that mood because it sounded nostalgic and unsettled at the same time.",
        items: [
          { label: "1971", href: track.rvYearHref ?? "/rv/1971", meta: "Year" },
          { label: "Tapestry", href: "/search?q=Carole%20King%20Tapestry", meta: "Same period" },
          { label: "What's Going On", href: "/search?q=Marvin%20Gaye%20What%27s%20Going%20On", meta: "Same period" },
        ],
      }),
      section("Overview", "Explore Further", {
        copy: control?.story.exploreFurther?.trim() || null,
        items: [
          { label: "The Day The Music Died", href: "/search?q=the%20day%20the%20music%20died", meta: "Origin story" },
          { label: "Buddy Holly", href: "/artist/buddy-holly", meta: "Reference point" },
          { label: "Vincent", href: "/search?q=Don%20McLean%20Vincent", meta: "Don McLean" },
          { label: "1971", href: track.rvYearHref ?? "/rv/1971", meta: "Year context" },
        ],
      }),
    ].filter((item): item is Song2Section => item != null);
  }

  const album = firstAlbum(track);
  const year = trackYear(track);
  return [
    section("Overview", "Why This Song Matters", {
      copy: [
        track.peakHot100
          ? `${track.title} became a nationally visible song, reaching #${track.peakHot100} on the Hot 100.`
          : null,
        track.chartWeeks > 0 ? `It stayed in circulation for ${track.chartWeeks} chart weeks.` : null,
        album ? `${album.title} places the song in its original album setting.` : null,
      ].filter(Boolean).join(" "),
    }),
    section("Overview", "About The Artist", {
      copy:
        artist.signatureTracks.length > 1
          ? `${titleCaseName(track.artistName)} has other charted songs connected to this one.`
          : null,
      facts: [
        artist.chartHighlights.top10Hits > 0 ? { label: "Top 10 Hits", value: String(artist.chartHighlights.top10Hits) } : null,
        artist.chartHighlights.hot100Appearances > 0
          ? { label: "Hot 100 Activity", value: String(artist.chartHighlights.hot100Appearances) }
          : null,
      ],
      items: [
        { label: titleCaseName(track.artistName), href: track.artistHref, meta: "Artist" },
        artist.relatedArtists[0]
          ? {
              label: titleCaseName(artist.relatedArtists[0].name),
              href: `/artist/${artist.relatedArtists[0].slug}`,
              meta: "Related artist",
            }
          : null,
      ],
    }),
    section("Overview", "The Year", {
      facts: [
        year ? { label: "Year", value: String(year) } : null,
        track.peakHot100 ? { label: "Hot 100", value: `#${track.peakHot100}` } : null,
        track.chartWeeks > 0 ? { label: "Chart Run", value: `${track.chartWeeks} weeks` } : null,
        album?.title ? { label: "Album", value: album.title } : null,
      ],
      items: [
        year
          ? { label: String(year), href: track.rvYearHref ?? `/rv/${year}`, meta: "Year" }
          : null,
        album?.href ? { label: album.title, href: album.href, meta: "Album" } : null,
      ],
    }),
  ].filter((item): item is Song2Section => item != null);
}

function storySections(track: TrackPageData, artist: ArtistPageData): Song2Section[] {
  if (isAmericanPie(track)) {
    return [
      section("Song Story", "Why This Song Became Important", {
        copy: "The song became important because listeners could hear it as both a mystery and a memorial. It gave people a way to talk about rock and roll changing, aging, and losing some of its early innocence.",
      }),
      section("Creation", "Why The Lyrics Stayed Open", {
        copy: "McLean never reduced the song to a simple key. That openness helped it last: every generation could argue about the symbols while still feeling the sadness underneath them.",
      }),
      section("Chart Journey", "A Long Song Became A Hit", {
        copy: "At more than eight minutes, American Pie was not shaped like a normal radio single, but it still became a mass-audience hit.",
        facts: [
          { label: "Peak", value: "#1" },
          { label: "Length", value: "8:42" },
        ],
      }),
      section("Legacy", "Explore Further", {
        items: [
          { label: "The Day The Music Died", href: "/search?q=the%20day%20the%20music%20died", meta: "Origin story" },
          { label: "Buddy Holly", href: "/artist/buddy-holly", meta: "Reference point" },
          { label: "Vincent", href: "/search?q=Don%20McLean%20Vincent", meta: "Don McLean" },
        ],
      }),
    ].filter((item): item is Song2Section => item != null);
  }

  const album = firstAlbum(track);
  return [
    section("Song Story", "Why The Song Became Important", {
      copy: [
        track.peakHot100
          ? `${track.title} cut through because it reached a national chart audience.`
          : null,
        album ? `The song also belongs to ${album.title}, giving it an album-era identity beyond the single.` : null,
      ].filter(Boolean).join(" "),
    }),
    section("Creation", "Why This Song Matters", {
      copy: album
        ? `${album.title}${album.releaseYear ? ` arrived in ${album.releaseYear}` : ""} and includes ${track.title}.`
        : null,
      items: album?.href ? [{ label: album.title, href: album.href, meta: "Album" }] : [],
    }),
    section("Chart Journey", "Chart Record", {
      copy: track.firstChartDate
        ? `${track.title} first appears in the chart record on ${compactDate(track.firstChartDate)}.`
        : null,
      facts: [
        track.peakHot100 ? { label: "Peak", value: `#${track.peakHot100}` } : null,
        track.chartWeeks > 0 ? { label: "Weeks", value: String(track.chartWeeks) } : null,
      ],
    }),
    section("Legacy", "Explore Further", {
      items: track.relatedTracks.slice(0, 4).map((song) => ({
        label: song.title,
        href: `/retroverse-2/song/${song.rvtr}`,
        meta: song.releaseYear ? String(song.releaseYear) : null,
      })),
      copy:
        artist.signatureTracks.length > 1
          ? `${titleCaseName(track.artistName)} has other charted songs connected to this record.`
          : null,
    }),
  ].filter((item): item is Song2Section => item != null);
}

function artistSections(track: TrackPageData, artist: ArtistPageData): Song2Section[] {
  if (isAmericanPie(track)) {
    return [
      section("Artist Profile", "About The Artist", {
        copy: "Don McLean stands in the singer-songwriter tradition, but American Pie made him more than a confessional writer. He became the person who turned rock nostalgia into a national singalong.",
      }),
      section("Major Hits", "Explore Further", {
        items: [
          { label: "Vincent", href: "/search?q=Don%20McLean%20Vincent", meta: "Major song" },
          { label: "American Pie", href: trackPageHref(track.rvtr), meta: "Signature song" },
        ],
      }),
    ].filter((item): item is Song2Section => item != null);
  }

  const hits = artist.signatureTracks
    .filter((song) => song.rvtr.toUpperCase() !== track.rvtr.toUpperCase())
    .slice(0, 6);
  const artistName = titleCaseName(track.artistName);

  return [
    section("Artist Profile", `Why ${artistName} Matters`, {
      copy:
        hits.length > 0
          ? `${artistName} has other records and chart moments connected to this song.`
          : null,
      facts: [
        artist.activeRange && artist.activeRange !== "—" ? { label: "Active Years", value: artist.activeRange } : null,
        artist.chartHighlights.top10Hits > 0 ? { label: "Top 10 Hits", value: String(artist.chartHighlights.top10Hits) } : null,
        artist.chartHighlights.hot100Appearances > 0
          ? { label: "Hot 100 Activity", value: String(artist.chartHighlights.hot100Appearances) }
          : null,
      ],
    }),
    section("Major Hits", "Explore Further", {
      items: hits.map((song) => ({
        label: song.title,
        href: `/retroverse-2/song/${song.rvtr}`,
        meta: song.peakHot100 ? `Hot 100 #${song.peakHot100}` : song.releaseYear ? String(song.releaseYear) : null,
      })),
    }),
    section("Career Milestones", "About The Artist", {
      facts: [
        artist.chartAlbumSpotlight?.albumTitle
          ? { label: "Album Peak", value: artist.chartAlbumSpotlight.albumTitle }
          : null,
        artist.chartHighlights.b200Albums > 0
          ? { label: "Billboard 200 Albums", value: String(artist.chartHighlights.b200Albums) }
          : null,
        artist.libraryTracks > 0 ? { label: "Playable Songs", value: String(artist.libraryTracks) } : null,
      ],
      items: artist.essentialAlbums.slice(0, 4).map((album) => ({
        label: album.title,
        href: album.rval ? `/album/${album.rval}` : null,
        meta: album.releaseYear ? String(album.releaseYear) : null,
      })),
    }),
  ].filter((item): item is Song2Section => item != null);
}

function cultureSections(track: TrackPageData, destination: RvYearDestination | null): Song2Section[] {
  if (isAmericanPie(track)) {
    return [
      section("Culture", "The Year", {
        copy: "In 1971, popular music was carrying heavier emotional weight. Albums like Tapestry, What's Going On, and Imagine made personal memory, politics, and loss feel central to the mainstream.",
        items: [
          { label: "Tapestry", href: "/search?q=Carole%20King%20Tapestry", meta: "Carole King" },
          { label: "What's Going On", href: "/search?q=Marvin%20Gaye%20What%27s%20Going%20On", meta: "Marvin Gaye" },
          { label: "Imagine", href: "/search?q=John%20Lennon%20Imagine", meta: "John Lennon" },
        ],
      }),
    ].filter((item): item is Song2Section => item != null);
  }

  const year = trackYear(track);
  if (!year && !destination) return [];
  return [
    section("Culture", "The Year", {
      copy: year
        ? `${year} was the cultural backdrop around ${track.title}, with chart attention moving across songs, albums, and artists.`
        : null,
      items: [
        ...(destination?.definingSongs.slice(0, 4).map((song) => ({
          label: song.title,
          href: song.href,
          meta: titleCaseName(song.artist),
        })) ?? []),
        ...(destination?.definingArtists.slice(0, 3).map((artist) => ({
          label: titleCaseName(artist.name),
          href: artist.href,
          meta: "Defining artist",
        })) ?? []),
      ],
    }),
  ].filter((item): item is Song2Section => item != null);
}

function mediaSections(track: TrackPageData, artist: ArtistPageData): Song2Section[] {
  if (isAmericanPie(track)) {
    return [
      section("Media", "Cultural Moments", {
        items: [
          { label: "American Pie", href: trackPageHref(track.rvtr), meta: "Song archive" },
          { label: "American Pie album", href: firstAlbum(track)?.href, meta: "Album" },
          { label: "The Day The Music Died", href: "/search?q=the%20day%20the%20music%20died", meta: "Reference" },
        ],
      }),
    ].filter((item): item is Song2Section => item != null);
  }

  const album = firstAlbum(track);
  return [
    section("Media", "Cultural Moments", {
      items: [
        track.coverUrl ? { label: track.title, href: trackPageHref(track.rvtr), meta: "Cover art" } : null,
        album?.href ? { label: album.title, href: album.href, meta: "Album" } : null,
        ...artist.essentialAlbums.slice(0, 3).map((entry) => ({
          label: entry.title,
          href: entry.rval ? `/album/${entry.rval}` : null,
          meta: entry.releaseYear ? String(entry.releaseYear) : null,
        })),
      ],
    }),
    section("Performance Footage", "Live-Ready Path", {
      copy: track.hasVdjMedia ? `${track.title} is available in the local performance library.` : null,
    }),
  ].filter((item): item is Song2Section => item != null);
}

function timelineSections(track: TrackPageData, artist: ArtistPageData): Song2Section[] {
  if (isAmericanPie(track)) {
    return [
      section("Timeline", "The Year", {
        items: [
          { label: "1959", href: "/search?q=the%20day%20the%20music%20died", meta: "Plane crash remembered in the song" },
          { label: "1971", href: track.rvYearHref ?? "/rv/1971", meta: "American Pie enters its moment" },
          { label: "8:42", href: trackPageHref(track.rvtr), meta: "Full-length single" },
          { label: "#1", href: trackPageHref(track.rvtr), meta: "Hot 100 peak" },
        ],
      }),
    ].filter((item): item is Song2Section => item != null);
  }

  const album = firstAlbum(track);
  const year = trackYear(track);
  const milestoneCandidates: (Song2Item | null)[] = [
    year ? { label: String(year), href: track.rvYearHref ?? `/rv/${year}`, meta: "Year context" } : null,
    album?.releaseYear
      ? { label: `${album.title}`, href: album.href, meta: `${album.releaseYear} album` }
      : null,
    track.firstChartDate
      ? { label: "First chart appearance", href: trackPageHref(track.rvtr), meta: compactDate(track.firstChartDate) }
      : null,
    track.peakHot100
      ? { label: `Reached Hot 100 #${track.peakHot100}`, href: trackPageHref(track.rvtr), meta: track.chartRunLabel }
      : null,
    ...artist.dominantYears.slice(0, 3).map((year) => ({
      label: String(year.year),
      href: `/rv/${year.year}`,
      meta: `${year.count} chart moments`,
    })),
  ];
  const milestones = milestoneCandidates.filter((item): item is Song2Item => item != null);

  return [
    section("Timeline", "The Year", {
      items: milestones,
    }),
  ].filter((item): item is Song2Section => item != null);
}

function buildTabs(
  track: TrackPageData,
  artist: ArtistPageData,
  destination: RvYearDestination | null,
  control?: SongControlData,
): Song2Tab[] {
  return [
    { id: "overview", label: TAB_LABELS.overview, sections: overviewSections(track, artist, control) },
    { id: "story", label: TAB_LABELS.story, sections: storySections(track, artist) },
    { id: "artist", label: TAB_LABELS.artist, sections: artistSections(track, artist) },
    { id: "culture", label: TAB_LABELS.culture, sections: cultureSections(track, destination) },
    { id: "media", label: TAB_LABELS.media, sections: mediaSections(track, artist) },
    { id: "timeline", label: TAB_LABELS.timeline, sections: timelineSections(track, artist) },
  ];
}

export default async function Retroverse2SongPage({ params }: Props) {
  const { rvtr } = await params;
  const track = await loadTrackPage(rvtr);
  if (!track) notFound();

  const [artist, destination, playback] = await Promise.all([
    loadArtistPage(track.artistSlug),
    yearDestination(track),
    resolveTrackPlayback(track.rvtr, { title: track.title, artist: track.artistName }),
  ]);
  const controlPackage = await loadSongControlPackage(track);
  const control = songControlData(controlPackage);
  const tabs = buildTabs(track, artist, destination, control);
  const year = trackYear(track);
  const about = aboutSongCopy(track, control);
  const stats = heroFacts(track);
  const moments = culturalMoments(track, artist, destination);
  const opsEnabled = isOpsEnabled();

  return (
    <Rv2PublicShell
      className="rv2-song"
      yearsHref={track.rvYearHref ?? (year ? `/rv/${year}` : "/search")}
      lead={<LiveChannelFollower rvtr={track.rvtr} />}
    >
      <section className="rv2-song__hero" aria-label="Song overview">
        <div className="rv2-song__hero-top">
          <div className="rv2-song__hero-copy">
            <p className="rv2-live__kicker">Song Experience</p>
            <h1>{track.title}</h1>
            <p className="rv2-song__artist">{titleCaseName(track.artistName)}</p>
            {year ? <p className="rv2-song__year">{year}</p> : null}
          </div>
          <div className="rv2-song__hero-flags">
            <p className="rv2-song__badge">Experience Ready</p>
            {opsEnabled ? (
              <Link href={`/retroverse-2/song/${track.rvtr}/data`} className="rv2-song__data-button">
                Data
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rv2-song__hero-stage">
          <div className="rv2-song__hero-art-col">
            {track.coverUrl ? (
              <div className="rv2-song__art-wrap">
                <img
                  src={track.coverUrl}
                  alt=""
                  className="rv2-song__art"
                  width={520}
                  height={520}
                  decoding="async"
                />
              </div>
            ) : null}
            {playback?.target?.url ? (
              <a
                href={playback.target.url}
                className="rv2-song__youtube-cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                Play on YouTube
              </a>
            ) : null}
          </div>
          <div className="rv2-song__hero-side">
            {about ? (
              <div className="rv2-song__about-card">
                <p className="rv2-live__eyebrow">About The Song</p>
                <p>{about}</p>
              </div>
            ) : null}

            {stats.length > 0 ? (
              <div className="rv2-song__hero-stats" aria-label="Key song facts">
                {stats.map((stat) => (
                  <div key={`${stat.label}-${stat.value}`} className="rv2-song__hero-stat">
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

      </section>

      <RetroverseSong2Tabs tabs={tabs} />

      {moments.length > 0 ? (
        <section className="rv2-song__moments" aria-label="Cultural Moments">
          <p className="rv2-live__eyebrow">Cultural Moments</p>
          <div className="rv2-song__moment-grid">
            {moments.map((moment) =>
              moment.href ? (
                <Link key={`${moment.title}-${moment.meta ?? ""}`} href={moment.href} className="rv2-song__moment-card">
                  {moment.coverUrl ? <img src={moment.coverUrl} alt="" /> : null}
                  <span>{moment.title}</span>
                  {moment.meta ? <small>{moment.meta}</small> : null}
                  {moment.copy ? <p>{moment.copy}</p> : null}
                </Link>
              ) : (
                <div key={`${moment.title}-${moment.meta ?? ""}`} className="rv2-song__moment-card">
                  {moment.coverUrl ? <img src={moment.coverUrl} alt="" /> : null}
                  <span>{moment.title}</span>
                  {moment.meta ? <small>{moment.meta}</small> : null}
                  {moment.copy ? <p>{moment.copy}</p> : null}
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}
    </Rv2PublicShell>
  );
}
