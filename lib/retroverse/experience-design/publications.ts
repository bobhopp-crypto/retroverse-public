import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

import type { PublicationDefinition, PublicationId } from "./types";

function pub(
  id: PublicationId,
  name: string,
  opts: Omit<PublicationDefinition, "id" | "name">,
): PublicationDefinition {
  return { id, name, ...opts };
}

export const PUBLICATION_LIBRARY: PublicationDefinition[] = [
  pub("billboard", "Billboard Magazine", {
    typography: "bold_sans",
    spacingScale: 0.95,
    framing: "bordered",
    headlineTreatment: "banner",
    captionStyle: "below",
    cardStyle: "framed",
    backgroundTexture: "gloss",
    preferredLayout: "magazine",
    dnaAffinities: ["chart", "high_energy", "magazine"],
    description: "Chart-forward banner headlines with bold sans and framed chart cards.",
  }),
  pub("rolling_stone", "Rolling Stone", {
    typography: "editorial_serif",
    spacingScale: 1.08,
    framing: "mat",
    headlineTreatment: "stacked",
    captionStyle: "sidebar",
    cardStyle: "sleeve",
    backgroundTexture: "paper",
    preferredLayout: "magazine",
    dnaAffinities: ["story", "cultural", "editorial"],
    description: "Long-form editorial serif with mat-framed photography and sidebar captions.",
  }),
  pub("creem", "Creem", {
    typography: "display_sans",
    spacingScale: 1.05,
    framing: "bleed",
    headlineTreatment: "banner",
    captionStyle: "overlay",
    cardStyle: "newsprint",
    backgroundTexture: "newsprint",
    preferredLayout: "collector",
    dnaAffinities: ["rock", "performance", "raw"],
    description: "Rebellious bleed layouts with newsprint texture and overlay captions.",
  }),
  pub("tv_guide", "TV Guide", {
    typography: "condensed_sans",
    spacingScale: 0.92,
    framing: "card",
    headlineTreatment: "centered",
    captionStyle: "credit",
    cardStyle: "ticket",
    backgroundTexture: "scanline",
    preferredLayout: "documentary",
    dnaAffinities: ["television", "broadcast", "1980s"],
    description: "Grid-card listings with scanline texture and compact condensed type.",
  }),
  pub("concert_program", "Concert Program", {
    typography: "editorial_serif",
    spacingScale: 1.12,
    framing: "mat",
    headlineTreatment: "italic_deck",
    captionStyle: "below",
    cardStyle: "ticket",
    backgroundTexture: "paper",
    preferredLayout: "performance",
    dnaAffinities: ["performance", "live", "stage"],
    description: "Program booklet spacing with italic decks and ticket-stub cards.",
  }),
  pub("album_liner", "Album Liner Notes", {
    typography: "editorial_serif",
    spacingScale: 1.15,
    framing: "bordered",
    headlineTreatment: "stacked",
    captionStyle: "sidebar",
    cardStyle: "sleeve",
    backgroundTexture: "paper",
    preferredLayout: "minimal",
    dnaAffinities: ["acoustic", "reflective", "story"],
    description: "Intimate sleeve notes with generous spacing and bordered inset images.",
  }),
  pub("mtv", "MTV", {
    typography: "bold_sans",
    spacingScale: 1,
    framing: "bleed",
    headlineTreatment: "banner",
    captionStyle: "overlay",
    cardStyle: "flat",
    backgroundTexture: "scanline",
    preferredLayout: "performance",
    dnaAffinities: ["television", "1980s", "performance", "high_energy"],
    description: "Full-bleed performance frames with MTV-era scanline atmosphere.",
  }),
  pub("record_store_card", "Record Store Display Card", {
    typography: "monospace_label",
    spacingScale: 0.9,
    framing: "card",
    headlineTreatment: "centered",
    captionStyle: "credit",
    cardStyle: "framed",
    backgroundTexture: "flat",
    preferredLayout: "collector",
    dnaAffinities: ["collectible", "chart", "pop"],
    description: "Collectible counter card with mono labels and tight framing.",
  }),
  pub("fan_club", "Fan Club Newsletter", {
    typography: "editorial_serif",
    spacingScale: 1.1,
    framing: "bordered",
    headlineTreatment: "stacked",
    captionStyle: "below",
    cardStyle: "flat",
    backgroundTexture: "paper",
    preferredLayout: "magazine",
    dnaAffinities: ["legacy", "warm", "community"],
    description: "Warm newsletter columns with stacked headlines and personal tone.",
  }),
  pub("newspaper_entertainment", "Newspaper Entertainment Section", {
    typography: "condensed_sans",
    spacingScale: 0.88,
    framing: "column",
    headlineTreatment: "banner",
    captionStyle: "credit",
    cardStyle: "newsprint",
    backgroundTexture: "newsprint",
    preferredLayout: "timeline",
    dnaAffinities: ["chart", "history", "documentary"],
    description: "Multi-column news layout with dateline captions and newsprint grain.",
  }),
  pub("music_trade", "Music Trade Magazine", {
    typography: "condensed_sans",
    spacingScale: 0.94,
    framing: "bordered",
    headlineTreatment: "banner",
    captionStyle: "sidebar",
    cardStyle: "framed",
    backgroundTexture: "gloss",
    preferredLayout: "documentary",
    dnaAffinities: ["industry", "chart", "data"],
    description: "Trade publication density with sidebar stats and framed data cards.",
  }),
];

export const PUBLICATION_BY_ID = Object.fromEntries(
  PUBLICATION_LIBRARY.map((p) => [p.id, p]),
) as Record<PublicationId, PublicationDefinition>;

export function suggestPublications(dna: CollectorSongDna | null, limit = 4): PublicationDefinition[] {
  const mood = `${dna?.experience.overallMood ?? ""} ${dna?.story.primaryTheme ?? ""} ${dna?.visual?.lightingStyle ?? ""}`.toLowerCase();
  const scored = PUBLICATION_LIBRARY.map((pub) => {
    let score = 0;
    for (const affinity of pub.dnaAffinities) {
      if (mood.includes(affinity)) score += 2;
    }
    if (mood.includes("television") && pub.id === "mtv") score += 3;
    if (mood.includes("performance") && pub.id === "concert_program") score += 3;
    if (mood.includes("chart") && pub.id === "billboard") score += 2;
    return { pub, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.pub);
}

export function defaultPublicationId(): PublicationId {
  return "rolling_stone";
}
