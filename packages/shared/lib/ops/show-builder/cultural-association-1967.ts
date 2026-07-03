import type { VdjPoolSong } from "./types";

/** Internal 1967 DJ-association spaces — never shown as genre labels. */
export type AssociationSpace1967 = {
  id: string;
  artists: string[];
  titles: string[];
};

/**
 * 1967 cultural co-presence groups: songs a DJ would mentally link on one year's show.
 * Artist signal dominates; titles are specific hits, not generic keywords.
 */
export const ASSOCIATION_SPACES_1967: AssociationSpace1967[] = [
  {
    id: "sunshine_am",
    artists: [
      "association",
      "monkees",
      "turtles",
      "mamas",
      "papas",
      "herman",
      "hollies",
      "beach boys",
      "young rascals",
      "rascals",
      "cowsills",
      "spanky",
      "our gang",
      "buckinghams",
      "crystal ship",
    ],
    titles: [
      "happy together",
      "windy",
      "daydream believer",
      "never my love",
      "pleasant valley",
      "darling be home",
      "kind of a drag",
    ],
  },
  {
    id: "psychedelic_sf",
    artists: [
      "jefferson airplane",
      "doors",
      "grateful dead",
      "jimi hendrix",
      "hendrix",
      "cream",
      "country joe",
      "13th floor",
      "strawberry alarm",
      "electric flag",
      "blue cheer",
      "iron butterfly",
      "moby grape",
      "scott mckenzie",
      "pink floyd",
      "first edition",
      "kenny rogers",
    ],
    titles: [
      "white rabbit",
      "somebody to love",
      "light my fire",
      "purple haze",
      "sunshine of your love",
      "in-a-gadda-da-vida",
      "summertime blues",
    ],
  },
  {
    id: "motown_soul",
    artists: [
      "aretha",
      "marvin gaye",
      "four tops",
      "temptations",
      "supremes",
      "sam and dave",
      "sam & dave",
      "otis",
      "jackie wilson",
      "wilson pickett",
      "jr walker",
      "isley",
      "gladys knight",
      "martha",
      "vandellas",
    ],
    titles: [
      "respect",
      "soul man",
      "chain of fools",
      "i heard it through the grapevine",
      "reach out",
      "stop in the name",
    ],
  },
  {
    id: "british_invasion",
    artists: [
      "beatles",
      "rolling stones",
      "kinks",
      "who",
      "yardbirds",
      "animals",
      "dave clark",
      "petula",
      "dona",
      "seekers",
      "zombies",
      "bee gees",
    ],
    titles: [
      "ruby tuesday",
      "waterloo sunset",
      "for your love",
      "satisfaction",
      "to love somebody",
    ],
  },
  {
    id: "folk_acoustic",
    artists: [
      "simon",
      "garfunkel",
      "dylan",
      "peter paul",
      "judy collins",
      "gordon lightfoot",
      "buffalo springfield",
      "byrds",
      "csny",
      "crosby",
    ],
    titles: [
      "for what it's worth",
      "sound of silence",
      "blowin in the wind",
      "mr tambourine",
      "turn turn turn",
    ],
  },
  {
    id: "romantic_ballad",
    artists: [
      "frankie valli",
      "four seasons",
      "lulu",
      "engelbert",
      "tom jones",
      "neil diamond",
      "frank sinatra",
      "nancy sinatra",
      "elvis",
      "roy orbison",
    ],
    titles: [
      "can't take my eyes",
      "something stupid",
      "to sir with love",
      "release me",
      "words",
    ],
  },
  {
    id: "rock_anthem",
    artists: [
      "steppenwolf",
      "van morrison",
      "procol harum",
      "traffic",
      "spencer davis",
      "sam the sham",
      "question mark",
      "mysterians",
      "mc5",
      "stooges",
      "box tops",
      "troggs",
    ],
    titles: [
      "born to be wild",
      "incense and peppermint",
      "96 tears",
      "louie louie",
      "gimme some lovin",
      "the letter",
      "whiter shade",
    ],
  },
  {
    id: "country_pop",
    artists: [
      "johnny cash",
      "merle haggard",
      "buck owens",
      "glen campbell",
      "roger miller",
      "sonny",
      "cher",
    ],
    titles: ["oklahoma city", "gentle on my mind", "by the time i get to phoenix"],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(song: VdjPoolSong): string {
  return normalizeText(`${song.artist} ${song.title}`);
}

export function associationVector1967(song: VdjPoolSong): number[] {
  const text = haystack(song);
  const scores = ASSOCIATION_SPACES_1967.map((space) => {
    let score = 0;
    for (const artist of space.artists) {
      const a = normalizeText(artist);
      if (text.includes(a)) score += 4;
    }
    for (const title of space.titles) {
      const t = normalizeText(title);
      if (text.includes(t)) score += 3.5;
    }
    return score;
  });

  // Soft same-artist gravity — helps DJ "this artist belongs with these peers"
  const artistKey = normalizeText(song.artist).split(" ").slice(0, 2).join(" ");
  const artistHash = [...artistKey].reduce((n, c) => n + c.charCodeAt(0), 0);
  scores.push((artistHash % 11) * 0.08);

  const sum = scores.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    // Unmatched: spread by artist so same artist still clusters
    return scores.map((_, i) => (i === scores.length - 1 ? 1 : 0.01));
  }
  return scores.map((v) => v / sum);
}
