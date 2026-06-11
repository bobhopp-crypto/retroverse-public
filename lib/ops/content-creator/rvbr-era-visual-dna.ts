import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type RvbrEraVisualDna = {
  slug: string;
  mandate: string[];
  forbidden: string[];
  palette: string[];
  references: string[];
};

/** Era-specific visual mandates — RVBR must dominate over generic visual-world templates. */
const ERA_VISUAL_DNA: Record<string, RvbrEraVisualDna> = {
  "1958-1961": {
    slug: "1958-1961",
    mandate: [
      "Early television and teen pop establishment aesthetic",
      "American Bandstand era — ballroom credential, dance hall ticket soul",
      "Conservative cream and tan stock, warm brown ink",
      "Doo-wop and girl-group era framing — orchestral pop warmth",
      "Vintage 45 RPM ticket aesthetic, perforated edges, modest ornament",
      "Clean-cut innocence — post-Elvis teen idol establishment",
    ],
    forbidden: [
      "MTV graphics, neon magenta, electric cyan, broadcast scan lines",
      "1980s geometric television framing or laminate security pass",
      "Psychedelic paisley, flower power, sunburst hippie ornament",
      "Grunge distress, xerox tear, punk zine collage",
      "Cartoon characters, mascots, Hanna-Barbera",
    ],
    palette: ["#f5e6c8", "#9a7a61", "#2d2d2d", "#8b6914", "#e8e4d8"],
    references: [
      "American Bandstand admission cards",
      "1950s dance hall tickets",
      "Teen idol variety show guest passes",
      "Early TV show credential plates",
      "Vintage ballroom admission stubs",
    ],
  },
  "1966-1969": {
    slug: "1966-1969",
    mandate: [
      "Psychedelic festival credential — Fillmore poster authority",
      "Ornate hand-drawn borders, flower power flourishes, sunburst illustration",
      "Summer of Love palette — hot orange, gold, crimson, deep purple on aged cream",
      "Hand-lettered display type energy, festival collectible warmth",
      "Counterculture peaks — expansive illustration dominates the pass",
    ],
    forbidden: [
      "MTV neon broadcast graphics, geometric TV blocks, scan-line CRT framing",
      "1980s music television laminate aesthetic",
      "Grunge xerox distress, torn zine edges, muted alternative palette",
      "Corporate security credential minimalism",
    ],
    palette: ["#e85d2a", "#f4c430", "#c41e3a", "#2d1b4e", "#f5e6c8"],
    references: [
      "Fillmore West posters",
      "Woodstock credentials",
      "1967 festival handbills",
      "Psychedelic rock poster frames",
      "Summer of Love collectible passes",
    ],
  },
  "1982-1985": {
    slug: "1982-1985",
    mandate: [
      "MTV pop dominance — music television broadcast credential",
      "Neon magenta, electric cyan, gold accents on charcoal laminate",
      "Geometric television framing, scan lines, broadcast graphics",
      "High-energy pop spectacle, video-era visual hierarchy",
      "VH1 / MTV backstage laminate collectible authority",
    ],
    forbidden: [
      "1950s teen idol ballroom innocence aesthetic",
      "Psychedelic paisley flower-power framing as dominant style",
      "Grunge distress, xerox tear, alternative zine darkness",
      "Cartoon characters, Hanna-Barbera, mascots",
    ],
    palette: ["#0d0d0d", "#ff2d6a", "#00e5ff", "#f4c430", "#f5f0e8"],
    references: [
      "MTV backstage passes",
      "VH1 credentials",
      "1980s concert laminates",
      "Music television guest badges",
      "Neon broadcast graphic frames",
    ],
  },
  "1990-1993": {
    slug: "1990-1993",
    mandate: [
      "Grunge and alternative takeover aesthetic",
      "Distressed xerox textures, torn paper edges, raw ink on off-white",
      "Darker mood — authenticity rejects 1980s gloss and excess",
      "Indie zine and unplugged energy, muted greens and browns",
      "Alternative rock credential — handmade, not corporate laminate",
    ],
    forbidden: [
      "MTV neon broadcast graphics as dominant framing",
      "1980s synthesizer pop gloss and yuppie materialism",
      "Psychedelic flower-power sunburst as dominant style",
      "1950s ballroom teen idol aesthetic",
      "Polished arena rock spectacle laminate",
    ],
    palette: ["#1a1a1a", "#6a7b68", "#8b7355", "#f0ead6", "#3d4a3a"],
    references: [
      "Grunge gig handbills",
      "Xerox club flyers",
      "MTV Unplugged era memorabilia",
      "Alternative rock tour laminates",
      "Distressed screen-print posters",
    ],
  },
};

function canonLine(profile: RvbrProfile, key: string): string | null {
  const text = profile.visualIdentity.sections?.[key];
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

export function hasKnownEraDna(slug: string): boolean {
  return slug in ERA_VISUAL_DNA;
}

export function rvbrEraVisualDnaForProfile(profile: RvbrProfile): RvbrEraVisualDna {
  const known = ERA_VISUAL_DNA[profile.slug];
  if (known) return known;

  const mood = canonLine(profile, "culturalMood");
  const media = canonLine(profile, "technologyMedia");
  const distinct = canonLine(profile, "whatMakesItDistinct");
  const accent = profile.visualIdentity.accent ?? "#9a7a61";

  return {
    slug: profile.slug,
    mandate: [
      `${profile.name} (${profile.eraStartYear}–${profile.eraEndYear}) visual identity`,
      mood ?? profile.narrative?.split("\n\n")[0] ?? "",
      distinct ?? "",
      media ?? "",
    ].filter(Boolean),
    forbidden: [
      "Do not default to MTV neon graphics unless this era is 1982–1989",
      "Do not default to psychedelic flower power unless this era is 1966–1973",
      "Match the historical period — avoid anachronistic television broadcast neon on pre-1980 eras",
    ],
    palette: [accent, "#f5e6c8", "#2d2d2d"],
    references: [profile.name, profile.visualIdentity.subtitle ?? ""].filter(Boolean),
  };
}

/** Prompt block — era mandate is PRIMARY over visual-world templates. */
export function rvbrEraVisualMandateBlock(profile: RvbrProfile): string {
  const dna = rvbrEraVisualDnaForProfile(profile);
  const mood = canonLine(profile, "culturalMood");
  const genres = canonLine(profile, "dominantGenres");
  const media = canonLine(profile, "technologyMedia");

  return [
    `═══ RVBR ERA VISUAL MANDATE (PRIMARY — overrides generic templates) ═══`,
    `Era: ${profile.name} · ${profile.eraStartYear}–${profile.eraEndYear}`,
    ``,
    `REQUIRED AESTHETIC:`,
    ...dna.mandate.map((m) => `- ${m}`),
    mood ? `- Cultural mood: ${mood}` : "",
    genres ? `- Dominant genres: ${genres}` : "",
    media ? `- Media context: ${media}` : "",
    ``,
    `REQUIRED PALETTE (use these hues, not generic defaults): ${dna.palette.join(", ")}`,
    `ERA ACCENT: ${profile.visualIdentity.accent ?? dna.palette[0]}`,
    ``,
    `VISUAL REFERENCES (illustration mood — do not print as text):`,
    ...dna.references.map((r) => `- ${r}`),
    ``,
    `FORBIDDEN FOR THIS ERA:`,
    ...dna.forbidden.map((f) => `- ${f}`),
    ``,
    `CRITICAL: This credential must read instantly as ${profile.eraStartYear}–${profile.eraEndYear} — not as a generic MTV pass.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const RVBR_VALIDATION_ERAS = [
  "1958-1961",
  "1966-1969",
  "1982-1985",
  "1990-1993",
] as const;
