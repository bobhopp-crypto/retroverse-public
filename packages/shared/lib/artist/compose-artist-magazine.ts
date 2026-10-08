import {
  MAGAZINE_CHAPTER_SURFACES,
  createPaletteAssigner,
  heroColor,
  type FlatTone,
} from "@/lib/theme/magazine-palette";

const ORDINALS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export type MagazineProfile = {
  summary: string | null;
  descriptor: string | null;
  story: string[];
  chronology: { year: number; text: string }[];
  artistQuotes: { text: string; on: string }[];
  credits: { title: string; role: string; year: number | null; peak: number | null }[];
  portraitUrl: string | null;
  /** Curator notes that are not already a chapter quote. Omitted when there is no profile. */
  notes?: { heading: string; items: { key: string; title: string | null; text: string; href: string | null }[] }[];
};

export type MagazineSongInput = {
  id: string;
  title: string;
  year: number | null;
  peak: number | null;
  variant: string | null;
  href: string | null;
  images: string[];
  quotes: string[];
  /** True when the recording is in the collection. */
  owned: boolean;
  albumTitle: string | null;
};

export type MagazineAlbumInput = {
  id: string;
  title: string;
  year: number | null;
  href: string | null;
  coverUrl: string | null;
};

export type MagazineQuote = { text: string; cite: string; tone: FlatTone };

export type MagazineSongView = {
  key: string;
  title: string;
  href: string | null;
  images: string[];
  letter: string;
  yearLabel: string | null;
  peakLabel: string | null;
  markerLeft: number | null;
  variant: string | null;
  listen: FlatTone;
  letterTone: FlatTone | null;
  marker: FlatTone | null;
  variantTone: FlatTone | null;
  play: FlatTone;
  quote: MagazineQuote | null;
};

export type MagazineAlbumView = {
  key: string;
  title: string;
  year: number | null;
  href: string | null;
  coverUrl: string | null;
  kicker: string;
  row: FlatTone;
  cover: FlatTone;
  kickerTone: FlatTone;
  titleTone: FlatTone;
};

export type MagazineChapter = {
  id: string;
  surface: string;
  stripe: FlatTone;
  label: string;
  labelTone: FlatTone;
  title: string;
  titleTone: FlatTone;
  compactTitle: boolean;
  range: string;
  rangeTone: FlatTone;
  paragraphs: { text: string; dropCap: boolean; tone: FlatTone | null }[];
  years: {
    year: number;
    tone: FlatTone;
    captions: { text: string; tone: FlatTone }[];
    albums: MagazineAlbumView[];
    songs: MagazineSongView[];
    quote: MagazineQuote | null;
  }[];
};

export type MagazinePage = {
  name: string;
  heroColor: string;
  heroImageUrl: string | null;
  initials: string;
  dek: string;
  standfirst: string;
  byline: string;
  fromCollection: boolean;
  wordmark: FlatTone;
  kicker: FlatTone;
  dekTone: FlatTone;
  bylineTone: FlatTone;
  openingRule: FlatTone;
  rail: {
    tone: FlatTone;
    tabs: { id: string; label: string; detail: string; tone: FlatTone }[];
  } | null;
  chapters: MagazineChapter[];
  back: {
    stripe: FlatTone;
    rule: FlatTone;
    title: FlatTone;
    badge: FlatTone;
    intro: string;
    songs: {
      key: string;
      title: string;
      images: string[];
      letter: string;
      letterTone: FlatTone | null;
      imageTone: FlatTone | null;
      note: string;
      noteTone: FlatTone;
    }[];
    albums: {
      key: string;
      title: string;
      href: string | null;
      coverUrl: string | null;
      year: number | null;
      cover: FlatTone;
      note: string;
      noteTone: FlatTone;
    }[];
  } | null;
  list: {
    frame: FlatTone;
    countTone: FlatTone;
    count: string;
    rest: string;
    sub: string;
    rows: {
      key: string;
      title: string;
      href: string | null;
      year: string;
      peak: string;
      variant: string | null;
      tone: FlatTone;
      variantTone: FlatTone | null;
      peakTone: FlatTone | null;
    }[];
  } | null;
  credits: {
    labelTone: FlatTone;
    rows: { key: string; title: string; role: string; peak: string | null; tone: FlatTone }[];
  } | null;
  essay: { text: string; dropCap: boolean; tone: FlatTone | null }[];
  dossier: {
    groups: {
      title: string;
      titleTone: FlatTone;
      items: { key: string; title: string | null; text: string; href: string | null; tone: FlatTone }[];
    }[];
  } | null;
  closingRule: FlatTone;
  footerTone: FlatTone;
};

type Painter = ReturnType<typeof createPaletteAssigner>;
type DatedSong = MagazineSongInput & { year: number };
type DraftQuote = { text: string; on: string };
type DraftYear = {
  year: number;
  captions: string[];
  albums: MagazineAlbumInput[];
  songs: { song: DatedSong; quote: DraftQuote | null }[];
  artistQuote: DraftQuote | null;
};
type DraftChapter = {
  id: string;
  decade: string;
  label: string;
  title: string;
  compactTitle: boolean;
  range: string;
  paragraphs: { text: string; dropCap: boolean }[];
  years: DraftYear[];
  songCount: number;
};

function word(count: number): string {
  return count < NUMBER_WORDS.length ? NUMBER_WORDS[count]! : String(count);
}

function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

function eraLabel(decade: string): string {
  return `’${decade.slice(2, 4)}s`;
}

function songNoun(count: number): string {
  return count === 1 ? "song" : "songs";
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

function nest(text: string): string {
  return text.replace(/"([^"]+)"/g, "‘$1’");
}

function ordered<T extends { year: number | null; peak: number | null; title: string }>(songs: T[]): T[] {
  return [...songs].sort((a, b) => {
    if ((a.year == null) !== (b.year == null)) return a.year == null ? 1 : -1;
    if ((a.year ?? 0) !== (b.year ?? 0)) return (a.year ?? 0) - (b.year ?? 0);
    if ((a.peak == null) !== (b.peak == null)) return a.peak == null ? 1 : -1;
    if ((a.peak ?? 0) !== (b.peak ?? 0)) return (a.peak ?? 0) - (b.peak ?? 0);
    return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
  });
}

export function selectMagazineSongs<T extends { owned: boolean }>(songs: T[]): {
  songs: T[];
  fromCollection: boolean;
} {
  const owned = songs.filter((song) => song.owned);
  if (owned.length > 0) return { songs: owned, fromCollection: true };
  return { songs, fromCollection: false };
}

function yearSpan(years: number[]): string | null {
  if (years.length === 0) return null;
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first}–${last}`;
}

function markerLeft(peak: number): number {
  return Math.round(92 - ((peak - 1) / 99) * 84);
}

function longestQuote(quotes: string[]): { quote: string; rest: string[] } | null {
  if (quotes.length === 0) return null;
  let quote = quotes[0]!;
  for (const candidate of quotes) {
    if (candidate.length > quote.length) quote = candidate;
  }
  return { quote, rest: quotes.filter((item) => item !== quote) };
}

function buildStandfirst(input: {
  name: string;
  summary: string | null;
  descriptor: string | null;
  songs: MagazineSongInput[];
  fromCollection: boolean;
  span: string | null;
}): string {
  if (input.summary) return input.summary;
  const count = input.songs.length;
  if (count === 0) return `${input.name} is in the archive. Songs are still being connected.`;
  const charted = input.songs.filter((song) => song.peak != null);
  const best = charted.reduce<number | null>((peak, song) => {
    if (song.peak == null) return peak;
    return peak == null || song.peak < peak ? song.peak : peak;
  }, null);
  const years = input.songs.flatMap((song) => (song.year != null ? [song.year] : []));
  const sameYear = years.length === 0 || Math.min(...years) === Math.max(...years);
  if (!input.fromCollection) {
    let sentence = `${input.name} has ${word(count)} Hot 100 ${songNoun(count)} in this Retroverse`;
    if (charted.length === 1 && charted[0]?.peak != null) {
      sentence += `, peaking at No. ${charted[0].peak}`;
      if (charted[0].year) sentence += ` in ${charted[0].year}`;
    } else if (best != null) {
      sentence += `, reaching as high as No. ${best}`;
    }
    if (input.span && !sameYear && charted.length !== 1) sentence += `, dated ${input.span}`;
    return `${sentence}.`;
  }
  const lead = input.descriptor ? `${input.name}, the ${input.descriptor},` : input.name;
  let sentence = `${lead} has ${word(count)} ${songNoun(count)} in your Retroverse`;
  if (charted.length === 1 && charted[0]?.peak != null) {
    sentence += `, one of them a Billboard Hot 100 hit that peaked at No. ${charted[0].peak}`;
    if (charted[0].year) sentence += ` in ${charted[0].year}`;
  } else if (charted.length > 1 && best != null) {
    sentence += `, ${word(charted.length)} of them Billboard Hot 100 hits reaching as high as No. ${best}`;
  }
  if (input.span && !sameYear && charted.length !== 1) sentence += `, dated ${input.span}`;
  return `${sentence}.`;
}

function paintChapterAlbum(paint: Painter, album: MagazineAlbumInput): MagazineAlbumView {
  const hasCover = Boolean(album.coverUrl);
  return {
    key: album.id,
    title: album.title,
    year: album.year,
    href: album.href,
    coverUrl: album.coverUrl,
    kicker: album.year != null ? `The album · ${album.year}` : "From the album",
    row: paint.take("div:alb", 1),
    cover: hasCover ? paint.take("img:cv", 1) : paint.take("div:ph", 2),
    kickerTone: paint.take("div:k", 1),
    titleTone: paint.take("div:at", 1),
  };
}

function paintSong(paint: Painter, song: DatedSong, quote: DraftQuote | null): MagazineSongView {
  const images = song.images.filter(Boolean);
  return {
    key: song.id,
    title: song.title,
    href: song.href,
    images,
    letter: song.title[0] ?? "•",
    yearLabel: String(song.year),
    peakLabel: song.peak != null ? `No. ${song.peak}` : null,
    markerLeft: song.peak != null ? markerLeft(song.peak) : null,
    variant: song.variant,
    listen: paint.take("div:listen", 1),
    letterTone: images.length === 0 ? paint.take("div:th", 2) : null,
    marker: song.peak != null ? paint.take("span:mk", 1) : null,
    variantTone: song.variant ? paint.take("span:v", 1) : null,
    play: paint.take("div:go", 1),
    quote: quote ? { text: nest(quote.text), cite: `On ${quote.on}`, tone: paint.take("div:pq", 3) } : null,
  };
}

function paintQuote(paint: Painter, quote: DraftQuote): MagazineQuote {
  return { text: nest(quote.text), cite: `On ${quote.on}`, tone: paint.take("div:pq", 3) };
}

export function composeArtistMagazine(input: {
  name: string;
  heroImageUrl: string | null;
  songs: MagazineSongInput[];
  albums: MagazineAlbumInput[];
  profile: MagazineProfile | null;
}): MagazinePage {
  const profile = input.profile;
  const name = input.name.trim() || "This artist";
  const selected = selectMagazineSongs(input.songs.filter((song) => song.title.trim()));
  const songs = ordered(selected.songs);
  const fromCollection = selected.fromCollection;
  const dated = songs.filter((song): song is DatedSong => song.year != null);
  const undated = songs.filter((song) => song.year == null);
  const chronology = (profile?.chronology ?? []).filter((row) => row.text.trim() && Number.isFinite(row.year));
  const story = (profile?.story ?? []).map((paragraph) => paragraph.trim()).filter(Boolean);
  const albums = input.albums.filter((album) => album.title.trim());

  const albumPlace = new Map<string, { decade: string; year: number }>();
  const backAlbums: MagazineAlbumInput[] = [];
  for (const album of albums) {
    if (album.year != null) {
      albumPlace.set(album.id, { decade: decadeOf(album.year), year: album.year });
      continue;
    }
    const linked = dated.filter((song) => song.albumTitle && song.albumTitle === album.title);
    const decades = new Set(linked.map((song) => decadeOf(song.year)));
    if (decades.size === 1) {
      const decade = [...decades][0]!;
      albumPlace.set(album.id, { decade, year: Math.min(...linked.map((song) => song.year)) });
    } else {
      backAlbums.push(album);
    }
  }

  const paraByDecade = new Map<string, string[]>();
  const placedStory = new Set<string>();
  for (const paragraph of story) {
    const counts = new Map<string, number>();
    for (const song of dated) {
      if (song.title.length > 3 && paragraph.includes(song.title)) {
        const decade = decadeOf(song.year);
        counts.set(decade, (counts.get(decade) ?? 0) + 1);
      }
    }
    if (counts.size === 0) continue;
    placedStory.add(paragraph);
    let bestDecade = "";
    let bestCount = -1;
    for (const [decade, count] of counts) {
      if (count > bestCount || (count === bestCount && decade > bestDecade)) {
        bestDecade = decade;
        bestCount = count;
      }
    }
    paraByDecade.set(bestDecade, [...(paraByDecade.get(bestDecade) ?? []), paragraph]);
  }

  const yearSet = new Set<number>();
  for (const song of dated) yearSet.add(song.year);
  for (const row of chronology) yearSet.add(row.year);
  for (const place of albumPlace.values()) yearSet.add(place.year);
  const decadeYears = new Map<string, number[]>();
  for (const year of [...yearSet].sort((a, b) => a - b)) {
    const decade = decadeOf(year);
    decadeYears.set(decade, [...(decadeYears.get(decade) ?? []), year]);
  }

  const drafts: DraftChapter[] = [];
  for (const [decade, years] of decadeYears) {
    const chapterSongs = dated.filter((song) => decadeOf(song.year) === decade);
    const paragraphs = paraByDecade.get(decade) ?? [];
    const pulls: { songId: string | null; text: string; on: string }[] = [];
    const artistQuote = (profile?.artistQuotes ?? []).find((quote) =>
      chapterSongs.some((song) => song.title === quote.on),
    );
    if (artistQuote) pulls.push({ songId: null, text: artistQuote.text, on: artistQuote.on });
    const narrative: string[] = [];
    for (const song of chapterSongs) {
      const picked = longestQuote(song.quotes);
      if (!picked) continue;
      pulls.push({ songId: song.id, text: picked.quote, on: song.title });
      if (paragraphs.length === 0) narrative.push(...picked.rest);
    }
    const kept = [
      ...pulls.filter((pull) => pull.songId == null).slice(0, 1),
      ...pulls.filter((pull) => pull.songId != null).slice(0, 2),
    ];
    const texts =
      paragraphs.length > 0 ? paragraphs : narrative.length > 0 ? [narrative.map(nest).join(" ")] : [];
    const draftYears: DraftYear[] = [];
    let placedArtist = false;
    for (const year of years) {
      const captions = chronology.filter((row) => row.year === year).map((row) => row.text);
      const yearAlbums = albums.filter((album) => {
        const place = albumPlace.get(album.id);
        return place?.decade === decade && place.year === year;
      });
      const yearSongs = chapterSongs.filter((song) => song.year === year);
      if (captions.length === 0 && yearAlbums.length === 0 && yearSongs.length === 0) continue;
      const artist = !placedArtist ? kept.find((pull) => pull.songId == null) ?? null : null;
      placedArtist = true;
      draftYears.push({
        year,
        captions,
        albums: yearAlbums,
        songs: yearSongs.map((song) => ({
          song,
          quote: kept.find((pull) => pull.songId === song.id) ?? null,
        })),
        artistQuote: artist ? { text: artist.text, on: artist.on } : null,
      });
    }
    if (draftYears.length === 0) continue;
    const index = drafts.length;
    const first = years[0]!;
    const last = years[years.length - 1]!;
    drafts.push({
      id: `ch${index}`,
      decade,
      label: `Chapter ${ORDINALS[index] ?? index + 1}`,
      title: `The ${decade}`,
      compactTitle: false,
      range: first === last ? String(first) : `${first}–${last}`,
      paragraphs: texts.map((text, paragraphIndex) => ({
        text,
        dropCap: paragraphIndex === 0 && text.length > 0 && !"‘“\"".includes(text[0]!),
      })),
      years: draftYears,
      songCount: chapterSongs.length,
    });
  }

  const multi = drafts.length >= 2;
  if (!multi && drafts[0]) {
    const chapter = drafts[0];
    const best = [...dated.filter((song) => decadeOf(song.year) === chapter.decade)].sort(
      (a, b) => (a.peak ?? 999) - (b.peak ?? 999) || a.year - b.year,
    )[0];
    chapter.label = "The Feature";
    chapter.title = best?.title ?? `The ${chapter.decade}`;
    chapter.compactTitle = chapter.title.length > 16;
    const years = chapter.years.map((year) => year.year);
    const first = years[0]!;
    const last = years[years.length - 1]!;
    chapter.range = first === last ? `${chapter.decade.slice(0, -1)}s · ${first}` : `${first}–${last}`;
  } else {
    drafts.forEach((chapter, index) => {
      chapter.label = `Chapter ${ORDINALS[index] ?? index + 1}`;
    });
  }

  const span = yearSpan([
    ...dated.map((song) => song.year),
    ...albums.flatMap((album) => (album.year != null ? [album.year] : [])),
    ...chronology.map((row) => row.year),
  ]);
  const descriptor = profile?.descriptor?.trim() || null;
  const summary = profile?.summary?.trim() || null;
  const count = songs.length;
  const dekLead = descriptor
    ? descriptor
    : fromCollection
      ? `${count} ${songNoun(count)} in your Retroverse`
      : count > 0
        ? `${count} Hot 100 ${songNoun(count)}`
        : "Archive page";
  const hero = heroColor(name);
  const paint = createPaletteAssigner(hero);

  const page: MagazinePage = {
    name,
    heroColor: hero,
    heroImageUrl: profile?.portraitUrl || input.heroImageUrl,
    initials: initials(name),
    dek: span ? `${dekLead} · ${span}` : dekLead,
    standfirst: buildStandfirst({ name, summary, descriptor, songs, fromCollection, span }),
    byline:
      count === 0 && drafts.length === 0
        ? "Artist In Depth"
        : `Artist In Depth · ${count} ${songNoun(count)} · ${multi ? `${drafts.length} chapters` : "a short feature"}`,
    fromCollection,
    wordmark: paint.take("b:wm", 1),
    kicker: paint.take("div:kick", 2),
    dekTone: paint.take("div:dek", 1),
    bylineTone: paint.take("div:by", 1),
    openingRule: paint.take("div:bar", 1),
    rail: multi
      ? {
          tone: paint.take("nav:rail", 1),
          tabs: drafts.map((chapter, index) => ({
            id: chapter.id,
            label: eraLabel(chapter.decade),
            detail: chapter.songCount === 0 ? "Albums" : `${chapter.songCount} ${songNoun(chapter.songCount)}`,
            tone: paint.take(index === 0 ? "a:on" : "a:", 1),
          })),
        }
      : null,
    chapters: drafts.map((chapter, index) => ({
      id: chapter.id,
      surface: MAGAZINE_CHAPTER_SURFACES[index % MAGAZINE_CHAPTER_SURFACES.length]!,
      stripe: paint.take("section:ch", 1),
      label: chapter.label,
      labelTone: paint.take("div:no", 2),
      title: chapter.title,
      titleTone: paint.take(chapter.compactTitle ? "h2:f" : "h2:", 1),
      compactTitle: chapter.compactTitle,
      range: chapter.range,
      rangeTone: paint.take("div:rng", 2),
      paragraphs: chapter.paragraphs.map((paragraph) => ({
        text: paragraph.text,
        dropCap: paragraph.dropCap,
        tone: paragraph.dropCap ? paint.take("p:dc", 1) : null,
      })),
      years: chapter.years.map((year) => ({
        year: year.year,
        tone: paint.take("div:yr", 1),
        captions: year.captions.map((text) => ({ text, tone: paint.take("div:cap", 1) })),
        albums: year.albums.map((album) => paintChapterAlbum(paint, album)),
        songs: year.songs.map((entry) => paintSong(paint, entry.song, entry.quote)),
        quote: year.artistQuote ? paintQuote(paint, year.artistQuote) : null,
      })),
    })),
    back: null,
    list: null,
    credits: null,
    essay: [],
    dossier: null,
    closingRule: { a: "#ff2937", ink: "#07070d" },
    footerTone: { a: "#ff2937", ink: "#07070d" },
  };

  if (undated.length > 0 || backAlbums.length > 0) {
    page.back = {
      stripe: paint.take("section:back", 1),
      rule: paint.take("div:hd", 1),
      title: paint.take("b:hb", 1),
      badge: paint.take("span:hs", 1),
      intro: fromCollection
        ? "Recordings and albums in your collection that don’t carry a date yet."
        : "Recordings and albums that don’t have a date on file yet.",
      songs: undated.map((song) => {
        const images = song.images.filter(Boolean);
        return {
          key: song.id,
          title: song.title,
          images,
          letter: song.title[0] ?? "•",
          letterTone: images.length === 0 ? paint.take("div:nt", 2) : null,
          imageTone: images.length > 0 ? paint.take("img:bpi", 1) : null,
          note: `${song.variant ? `${song.variant} · ` : ""}Year not on file`,
          noteTone: paint.take("div:bs", 1),
        };
      }),
      albums: backAlbums.map((album) => {
        const hasCover = Boolean(album.coverUrl);
        return {
          key: album.id,
          title: album.title,
          href: album.href,
          coverUrl: album.coverUrl,
          year: album.year,
          cover: hasCover ? paint.take("img:cv", 1) : paint.take("div:ph", 2),
          note: fromCollection ? "Album · on your shelf" : "Album",
          noteTone: paint.take("div:bs", 1),
        };
      }),
    };
  }

  if (songs.length > 0) {
    page.list = {
      frame: paint.take("div:iyr", 1),
      countTone: paint.take("em:ie", 1),
      count: String(count),
      rest: fromCollection ? ` ${songNoun(count)} you own` : ` ${songNoun(count)}`,
      sub: fromCollection
        ? `Every ${name} recording in your collection, oldest first.`
        : "Charted recordings, oldest first.",
      rows: songs.map((song) => ({
        key: song.id,
        title: song.title,
        href: song.href,
        year: song.year != null ? String(song.year) : "—",
        peak: song.peak != null ? `No. ${song.peak}` : "",
        variant: song.variant,
        tone: paint.take("li:", 1),
        variantTone: song.variant ? paint.take("span:v", 1) : null,
        peakTone: song.peak != null ? paint.take("span:p", 1) : null,
      })),
    };
  }

  const creditRows = (profile?.credits ?? []).filter((credit) => credit.title.trim());
  if (creditRows.length > 0) {
    page.credits = {
      labelTone: paint.take("span:ls", 1),
      rows: creditRows.map((credit, index) => ({
        key: `${credit.title}-${index}`,
        title: credit.title,
        role: credit.year != null ? `${credit.role} · ${credit.year}` : credit.role,
        peak: credit.peak != null ? `No. ${credit.peak}` : null,
        tone: paint.take("div:cr", 1),
      })),
    };
  }

  const unusedStory = story.filter((paragraph) => !placedStory.has(paragraph));
  if (unusedStory.length > 0) {
    page.essay = unusedStory.map((text, index) => ({
      text,
      dropCap: index === 0 && text.length > 0 && !"‘“\"".includes(text[0]!),
      tone: index === 0 ? paint.take("p:essay", 1) : null,
    }));
  }

  const noteGroups = (profile?.notes ?? [])
    .map((group) => ({
      heading: group.heading.trim(),
      items: group.items.filter((item) => item.title?.trim() || item.text.trim()),
    }))
    .filter((group) => group.heading && group.items.length > 0);
  if (noteGroups.length > 0) {
    page.dossier = {
      groups: noteGroups.map((group) => ({
        title: group.heading,
        titleTone: paint.take("h2:wk", 1),
        items: group.items.map((item) => ({
          key: item.key,
          title: item.title?.trim() || null,
          text: item.text.trim(),
          href: item.href,
          tone: paint.take("div:wk", 1),
        })),
      })),
    };
  }

  page.closingRule = paint.take("div:bar", 1);
  page.footerTone = paint.take("span:fs", 1);
  return page;
}
