import assert from "node:assert/strict";
import test from "node:test";

import { composeArtistMagazine, type MagazineSongInput } from "./compose-artist-magazine";

function song(partial: Partial<MagazineSongInput> & Pick<MagazineSongInput, "title" | "year">): MagazineSongInput {
  return {
    id: partial.id ?? partial.title,
    title: partial.title,
    year: partial.year,
    peak: partial.peak ?? null,
    variant: partial.variant ?? null,
    href: partial.href ?? "/retroverse-2/song/RVTR000001",
    images: partial.images ?? [],
    quotes: partial.quotes ?? [],
    owned: partial.owned ?? true,
    albumTitle: partial.albumTitle ?? null,
  };
}

test("opening colors follow the shared palette and a single era is a short feature", () => {
  const page = composeArtistMagazine({
    name: "Madonna",
    heroImageUrl: "https://example.com/madonna.jpg",
    songs: [song({ title: "Lucky Star", year: 1984, peak: 4, owned: true })],
    albums: [],
    profile: null,
  });
  assert.equal(page.heroColor, "#d036ff");
  assert.equal(page.wordmark.a, "#d036ff");
  assert.equal(page.kicker.a, "#d036ff");
  assert.equal(page.kicker.b, undefined);
  assert.equal(page.chapters[0]?.stripe.a, "#ffee00");
  assert.equal(page.list?.frame.a, "#0099ff");
  assert.equal(page.footerTone.a, "#d036ff");
  assert.equal(page.rail, null);
  assert.equal(page.chapters.length, 1);
  assert.equal(page.chapters[0]?.label, "The Feature");
  assert.equal(page.chapters[0]?.title, "Lucky Star");
  assert.match(page.byline, /a short feature/);
  assert.equal(page.list?.rest, " song you own");
  assert.equal(page.chapters[0]?.paragraphs.length, 0);
  assert.equal(page.credits, null);
});

test("two eras keep the rail and chapter labels, and drop the rail below two", () => {
  const page = composeArtistMagazine({
    name: "Madonna",
    heroImageUrl: null,
    songs: [
      song({ title: "Lucky Star", year: 1984, peak: 4 }),
      song({ title: "Frozen", year: 1998, peak: 2 }),
    ],
    albums: [],
    profile: null,
  });
  assert.equal(page.rail?.tabs.map((tab) => tab.label).join(" "), "’80s ’90s");
  assert.deepEqual(
    page.rail?.tabs.map((tab) => tab.tone.a),
    ["#ffee00", "#0099ff"],
  );
  assert.deepEqual(
    page.chapters.map((chapter) => chapter.label),
    ["Chapter One", "Chapter Two"],
  );
  assert.deepEqual(
    page.chapters.map((chapter) => chapter.title),
    ["The 1980s", "The 1990s"],
  );
});

test("a thin chart-only artist does not claim ownership", () => {
  const page = composeArtistMagazine({
    name: "The Georgia Satellites",
    heroImageUrl: null,
    songs: [
      song({ title: "Keep Your Hands To Yourself", year: 1986, peak: 2, owned: false }),
      song({ title: "Battleship Chains", year: 1987, peak: 86, owned: false }),
      song({ title: "Hippy Hippy Shake", year: 1988, peak: 45, owned: false }),
    ],
    albums: [{ id: "album", title: "Georgia Satellites", year: 1986, href: "/album/RVAL921951", coverUrl: null }],
    profile: null,
  });
  assert.equal(page.heroColor, "#ff2937");
  assert.equal(page.initials, "TG");
  assert.equal(page.rail, null);
  assert.equal(page.chapters[0]?.label, "The Feature");
  assert.equal(page.chapters[0]?.title, "Keep Your Hands To Yourself");
  assert.equal(page.chapters[0]?.compactTitle, true);
  assert.equal(page.fromCollection, false);
  assert.equal(page.list?.rest, " songs");
  assert.doesNotMatch(page.standfirst, /you own|your collection/);
  assert.equal(page.list?.rows.some((row) => /RVAL|RVTR|RVAR/.test(row.title)), false);
});

test("owned songs win, story text is the only drop cap, and quotes stay with the song", () => {
  const page = composeArtistMagazine({
    name: "Madonna",
    heroImageUrl: null,
    songs: [
      song({
        title: "Borderline",
        year: 1984,
        peak: 10,
        owned: true,
        quotes: ["Short.", "Written and produced by Reggie Lucas, the track was developed during the album's recording sessions."],
      }),
      song({ title: "Missing Hit", year: 1985, peak: 1, owned: false }),
    ],
    albums: [],
    profile: {
      summary: "Madonna is a pop singer whose Hot 100 run in this Retroverse stretch runs from early-1980s breakthrough singles through late-2000s dance-floor returns.",
      descriptor: "Pop singer",
      story: ["She arrives on the charts with debut-era singles like Borderline."],
      chronology: [{ year: 1984, text: "Like A Virgin / Material Girl stretch turns mid-1980s pop into a sustained chart presence." }],
      artistQuotes: [{ text: "Dubbed the \"Queen of Pop\", she is known for her continual reinvention.", on: "Borderline" }],
      credits: [{ title: "4 Minutes", role: "with Justin Timberlake & Timbaland", year: 2008, peak: 3 }],
      portraitUrl: null,
    },
  });
  assert.equal(page.list?.rows.length, 1);
  assert.equal(page.list?.rows[0]?.title, "Borderline");
  assert.equal(page.standfirst.startsWith("Madonna is a pop singer"), true);
  assert.match(page.dek, /^Pop singer/);
  assert.equal(page.chapters[0]?.paragraphs[0]?.dropCap, true);
  assert.match(page.chapters[0]?.paragraphs[0]?.text ?? "", /Borderline/);
  const year = page.chapters[0]?.years.find((entry) => entry.year === 1984);
  assert.match(year?.captions[0]?.text ?? "", /Like A Virgin/);
  assert.match(year?.quote?.text ?? "", /Queen of Pop/);
  assert.match(year?.songs[0]?.quote?.text ?? "", /Reggie Lucas/);
  assert.equal(page.credits?.rows[0]?.title, "4 Minutes");
  assert.equal(page.credits?.rows[0]?.peak, "No. 3");
});

test("a chart-only undated album keeps its link and does not claim a shelf", () => {
  const page = composeArtistMagazine({
    name: "The Georgia Satellites",
    heroImageUrl: null,
    songs: [song({ title: "Keep Your Hands To Yourself", year: 1986, peak: 2, owned: false })],
    albums: [{ id: "loose", title: "Loose", year: null, href: "/album/RVAL000001", coverUrl: null }],
    profile: null,
  });
  assert.equal(page.fromCollection, false);
  assert.equal(page.back?.albums[0]?.href, "/album/RVAL000001");
  assert.equal(page.back?.albums[0]?.note, "Album");
});

test("story that names no song still opens the magazine", () => {
  const page = composeArtistMagazine({
    name: "Madonna",
    heroImageUrl: null,
    songs: [song({ title: "Lucky Star", year: 1984, peak: 4 })],
    albums: [],
    profile: {
      summary: null,
      descriptor: null,
      story: ["A career told without naming a chart title."],
      chronology: [],
      artistQuotes: [],
      credits: [],
      portraitUrl: null,
      notes: [{ heading: "Worth knowing", items: [{ key: "n", title: null, text: "She kept changing the show.", href: null }] }],
    },
  });
  assert.equal(page.chapters[0]?.paragraphs.length, 0);
  assert.equal(page.essay[0]?.dropCap, true);
  assert.match(page.essay[0]?.text ?? "", /career/);
  assert.equal(page.dossier?.groups[0]?.title, "Worth knowing");
  assert.equal(page.dossier?.groups[0]?.items[0]?.text, "She kept changing the show.");
});

test("an undated recording goes to the back pages and an empty artist stays quiet", () => {
  const dated = composeArtistMagazine({
    name: "Madonna",
    heroImageUrl: null,
    songs: [song({ title: "I'll Remember", year: null, owned: true })],
    albums: [],
    profile: null,
  });
  assert.equal(dated.chapters.length, 0);
  assert.equal(dated.back?.songs[0]?.title, "I'll Remember");
  assert.match(dated.back?.songs[0]?.note ?? "", /Year not on file/);

  const empty = composeArtistMagazine({
    name: "Nobody",
    heroImageUrl: null,
    songs: [],
    albums: [],
    profile: null,
  });
  assert.equal(empty.chapters.length, 0);
  assert.equal(empty.list, null);
  assert.equal(empty.rail, null);
  assert.match(empty.standfirst, /still being connected/);
});
