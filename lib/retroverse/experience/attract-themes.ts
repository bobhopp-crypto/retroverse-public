import type { AttractTourEntry } from "./attract-tour-pool";

export type AttractTheme = {
  id: string;
  title: string;
  description: string;
  match: (entry: AttractTourEntry) => boolean;
};

function summerMatch(entry: AttractTourEntry): boolean {
  const text = `${entry.title} ${entry.artist}`.toLowerCase();
  return /\bsummer\b|\bsummertime\b|\bhot\b|\bsun\b|\bbeach\b/.test(text);
}

function oneHitMatch(entry: AttractTourEntry): boolean {
  return entry.playCount > 20 && entry.storyScore <= 3;
}

function yearMatch(year: number): (entry: AttractTourEntry) => boolean {
  return (entry) => entry.releaseYear === year;
}

/** Themed auto-tour exhibits built from existing metadata. */
export function buildAttractThemes(entries: AttractTourEntry[]): AttractTheme[] {
  const years = new Map<number, number>();
  for (const entry of entries) {
    if (entry.releaseYear) {
      years.set(entry.releaseYear, (years.get(entry.releaseYear) ?? 0) + 1);
    }
  }
  const topYears = [...years.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([year]) => year);

  const themes: AttractTheme[] = [
    {
      id: "summer",
      title: "Summer Songs",
      description: "Sun-soaked hits and seasonal anthems",
      match: summerMatch,
    },
    {
      id: "one-hit-wonders",
      title: "One Hit Wonders",
      description: "Songs that burned bright and fast",
      match: oneHitMatch,
    },
    {
      id: "experience-ready",
      title: "Featured Stories",
      description: "The richest stories in the collection",
      match: (e) => e.experienceReady && e.storyScore >= 5,
    },
    {
      id: "most-played",
      title: "Most Played",
      description: "The records you keep returning to",
      match: (e) => e.playCount >= 50,
    },
    {
      id: "british-invasion",
      title: "British Invasion",
      description: "UK artists who reshaped the charts",
      match: (e) =>
        /\b(beatles|stones|who|kinks|dave clark|herman|zombies|yardbirds)\b/i.test(
          `${e.artist} ${e.title}`,
        ),
    },
    {
      id: "motown",
      title: "Motown",
      description: "Hits from Hitsville U.S.A.",
      match: (e) => /\bmotown\b|\bsupremes\b|\btemptations\b|\bmarvin gaye\b|\bstevie wonder\b/i.test(e.artist),
    },
  ];

  for (const year of topYears) {
    themes.push({
      id: `year-${year}`,
      title: `Songs from ${year}`,
      description: `What defined ${year}`,
      match: yearMatch(year),
    });
  }

  return themes.filter((theme) => entries.some(theme.match));
}

export function pickThemedTourSlice(
  entries: AttractTourEntry[],
  themeIndex: number,
  seed: number,
): { theme: AttractTheme; songs: AttractTourEntry[] } | null {
  const themes = buildAttractThemes(entries);
  if (themes.length === 0) return null;
  const theme = themes[themeIndex % themes.length]!;
  const matched = entries.filter(theme.match);
  if (matched.length === 0) return pickThemedTourSlice(entries, themeIndex + 1, seed);
  const rotated = [...matched];
  const offset = seed % rotated.length;
  return {
    theme,
    songs: [...rotated.slice(offset), ...rotated.slice(0, offset)],
  };
}
