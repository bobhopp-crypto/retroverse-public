/**
 * Locked starter names. A slug such as `madonna` is only a redirect hint.
 * The public route is the RVAR from resolveCanonicalArtist.
 */

export type StarterArtist = {
  slug: string;
  name: string;
  tier: "ship" | "alternate";
};

const SHIP_NAMES = [
  "Madonna",
  "The Beatles",
  "Mariah Carey",
  "The Rolling Stones",
  "Billy Joel",
  "U2",
  "ABBA",
  "Aerosmith",
  "Taylor Swift",
  "Kenny Chesney",
  "Britney Spears",
  "Janet Jackson",
  "David Bowie",
  "Drake",
  "Elton John",
  "Michael Jackson",
  "Lady Gaga",
  "Rihanna",
  "Duran Duran",
  "Journey",
] as const;

const ALTERNATE_NAMES = ["Blondie", "Cher", "Rod Stewart", "Maroon 5", "Heart"] as const;

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toStarter(name: string, tier: StarterArtist["tier"]): StarterArtist {
  return { slug: slugFromName(name), name, tier };
}

export const STARTER_ARTISTS: StarterArtist[] = SHIP_NAMES.map((name) => toStarter(name, "ship"));

export const ALTERNATE_ARTISTS: StarterArtist[] = ALTERNATE_NAMES.map((name) =>
  toStarter(name, "alternate"),
);

const BY_SLUG = new Map(
  [...STARTER_ARTISTS, ...ALTERNATE_ARTISTS].map((artist) => [artist.slug, artist]),
);

export function starterArtistBySlug(slug: string): StarterArtist | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}
