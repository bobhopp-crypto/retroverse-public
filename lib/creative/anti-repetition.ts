import type { RvbrPromptProfile } from "@/lib/creative/rvbr-prompt-profile";

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
    ...(eraBlock?.negativeWeighting ?? []),
    ...(profile.negativePromptTerms ?? []),
  ];
  if (negative.length) {
    parts.push(``, `Negative weighting — strongly avoid:`, ...negative.map((n) => `- ${n}`));
  }

  const required = eraBlock?.requireComposition ?? profile.compositionVariety ?? [];
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
