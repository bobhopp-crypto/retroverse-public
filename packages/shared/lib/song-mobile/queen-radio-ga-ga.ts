import type { MobileSongExperience } from "./types";

const COVER_THE_WORKS =
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL450885/RVAL450885__queen__the-works.jpg";
const COVER_NEWS_OF_THE_WORLD =
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL382697/RVAL382697__queen__news-of-the-world.jpg";
const COVER_BOHEMIAN_SOUNDTRACK =
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL276670/RVAL276670__queen__bohemian-rhapsody-soundtrack.jpg";
const COVER_GREATEST_HITS =
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL672719/RVAL672719__queen__greatest-hits-we-will-rock-you.jpg";

/**
 * Radio Ga Ga (RVTR970715) — the first hardcoded Mobile Experience.
 * Chart facts sourced from the Retroverse graph
 * (data/ops/intelligence/research-department/RVTR970715/collector.json).
 * Cultural/biographical copy is well-documented public history.
 */
export const QUEEN_RADIO_GA_GA: MobileSongExperience = {
  rvtr: "RVTR970715",
  artist: "Queen",
  artistHref: "/artist/queen",
  title: "Radio Ga Ga",
  year: 1984,

  hero: {
    imageUrl: "/song/radio-ga-ga/hero.jpg",
    imageAlt: "Queen performing Radio Ga Ga",
  },

  story: {
    paragraph:
      "Written by drummer Roger Taylor and released as the lead single from The Works, \u201cRadio Ga Ga\u201d marked a bold new direction for Queen \u2014 a synth-driven anthem built to fill arenas. It became one of the band\u2019s biggest global hits, climbing charts across the world and giving audiences a call-and-response hand-clap that would soon become legendary.",
  },

  liveAid: {
    headline: "The Song That Opened Live Aid",
    paragraph:
      "On July 13, 1985, Queen opened their set at Wembley Stadium with \u201cRadio Ga Ga.\u201d Freddie Mercury cued 72,000 people into the song\u2019s synchronized hand-claps in perfect unison \u2014 a moment now remembered as one of the greatest in live rock history, and the performance widely credited with reigniting Queen\u2019s career.",
    imageUrl: "/song/radio-ga-ga/performance.jpg",
    imageAlt: "Queen performing live",
  },

  charts: {
    peakPosition: "#16 US \u00b7 #2 UK",
    countries: "Charted worldwide",
    release: "January 1984",
    album: "The Works",
  },

  didYouKnow: [
    "\u201cRadio Ga Ga\u201d was written by drummer Roger Taylor \u2014 a rare Queen hit not written by Freddie Mercury or Brian May.",
    "The song peaked at #16 on the Billboard Hot 100 and spent 13 weeks on the chart.",
    "It was the lead single from The Works, released in 1984.",
    "The title is said to have come from Taylor's young son, who called the radio \u201cradio ca-ca.\u201d",
    "This one's been a Retroverse DJ favorite \u2014 spun 11 times in the library.",
  ],

  relatedSongs: [
    {
      rvtr: "RVTR976054",
      title: "Bohemian Rhapsody",
      artist: "Queen",
      coverUrl: COVER_GREATEST_HITS,
      href: "/retroverse-2/song/RVTR976054",
    },
    {
      rvtr: "RVTR952100",
      title: "We Are The Champions",
      artist: "Queen",
      coverUrl: COVER_NEWS_OF_THE_WORLD,
      href: "/retroverse-2/song/RVTR952100",
    },
    {
      rvtr: "RVTR855265",
      title: "I Want To Break Free",
      artist: "Queen",
      coverUrl: COVER_BOHEMIAN_SOUNDTRACK,
      href: "/retroverse-2/song/RVTR855265",
    },
  ],

  explore: {
    albums: [
      { title: "The Works", year: 1984, coverUrl: COVER_THE_WORKS },
      { title: "News Of The World", year: 1977, coverUrl: COVER_NEWS_OF_THE_WORLD },
      { title: "Greatest Hits", year: 1981, coverUrl: COVER_GREATEST_HITS },
    ],
    bandMembers: [
      { name: "Freddie Mercury", role: "Vocals, Piano" },
      { name: "Brian May", role: "Guitar, Vocals" },
      { name: "Roger Taylor", role: "Drums, Vocals" },
      { name: "John Deacon", role: "Bass" },
    ],
    timeline: [
      { year: "1970", label: "Queen forms in London" },
      { year: "1975", label: "\u201cBohemian Rhapsody\u201d \u00b7 A Night at the Opera" },
      { year: "1977", label: "News Of The World \u00b7 \u201cWe Will Rock You\u201d" },
      { year: "1984", label: "The Works \u00b7 \u201cRadio Ga Ga\u201d" },
      { year: "1985", label: "Live Aid, Wembley Stadium" },
      { year: "1991", label: "Freddie Mercury passes away" },
    ],
  },
};
