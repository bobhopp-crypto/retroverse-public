import type { RvbrPromptProfile } from "@/lib/creative/rvbr-prompt-profile";

const GLOBAL_NEGATIVE_WEIGHTING = [
  "AI portrait of a person as focal subject",
  "celebrity lookalike or famous face",
  "generic stock photo people",
  "crowd scene as main subject",
  "photorealistic headshot",
  "random human figure dominating the card",
];

const GLOBAL_REQUIRE_COMPOSITION = [
  "credential object and typography as hero",
  "collector seals, stamps, and admission plates",
  "archival memorabilia fragments and laminate stock",
  "hand-lettered event typography on ephemera",
];

/** Era-specific anti-repetition — require distinct artifacts, not recolored templates. */
const ERA_ANTI_REPETITION: Record<string, { negativeWeighting: string[]; requireComposition: string[] }> = {
  "1970-1973": {
    negativeWeighting: [
      "giant sun face",
      "Woodstock cliché",
      "generic flower border",
      "generic crowd silhouette",
      "generic psychedelic poster",
      "BIG TITLE over BIG ART poster stack",
      "venue building illustration",
      "pub facade or invented architecture",
      "marquee or stadium as visual subject",
    ],
    requireComposition: [
      "close-up objects and ephemera fragments",
      "backstage credentials and production plates",
      "ticket stub fragments and admission stock",
      "record-label motifs and promo postcards",
      "radio station graphics and FM promo cards",
      "tour ephemera and road-worn laminate plates",
      "music press credentials and editorial stamps",
    ],
  },
};

export function antiRepetitionPromptBlock(
  eraSlug: string,
  profile: RvbrPromptProfile,
  maximizeVariation: boolean,
): string {
  const eraBlock = ERA_ANTI_REPETITION[eraSlug];
  const parts: string[] = [
    `ANTI-REPETITION CONTROLS:`,
    `Ten passes from the same era must look like ten different collectible artifacts — not the same pass with different decorations.`,
  ];

  if (!maximizeVariation) {
    parts.push(`Variation mode reduced — still avoid identical layout skeletons.`);
  }

  const negative = [
    ...GLOBAL_NEGATIVE_WEIGHTING,
    ...(eraBlock?.negativeWeighting ?? []),
    ...(profile.negativePromptTerms ?? []),
  ];
  if (negative.length) {
    parts.push(``, `Negative weighting — strongly avoid:`, ...negative.map((n) => `- ${n}`));
  }

  const required = [
    ...GLOBAL_REQUIRE_COMPOSITION,
    ...(eraBlock?.requireComposition ?? []),
    ...(profile.compositionVariety ?? []),
  ];
  if (required.length) {
    parts.push(
      ``,
      `Require composition variety — draw from these artifact modes:`,
      ...required.map((r) => `- ${r}`),
    );
  }

  parts.push(
    ``,
    `Each generation must change: layout skeleton, focal subject, typography arrangement, visual hierarchy, and object type.`,
  );

  return parts.join("\n");
}
