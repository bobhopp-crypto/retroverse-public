/** Venue reference assets — prevent AI from inventing unrecognized buildings. */

export type VenueReference = {
  venueId: string;
  name: string;
  referenceImage?: string;
  description: string;
  promptInstructions: string;
};

const VENUE_REFERENCES: VenueReference[] = [
  {
    venueId: "main-pub",
    name: "The Main Pub",
    description:
      "Retroverse Sunday Nights home venue — intimate neighborhood pub with recognizable facade, warm lit windows, established signage, and local character. Not a generic British pub or random invented building.",
    promptInstructions: [
      `VENUE REFERENCE — THE MAIN PUB (MANDATORY):`,
      `Do NOT invent or fabricate a random pub building.`,
      `Do NOT illustrate a generic tavern, fictional facade, or stock architecture.`,
      `Use the established Retroverse Main Pub character:`,
      `- Recognizable neighborhood pub facade with consistent signage`,
      `- Warm window glow, local intimate scale, Sunday Nights home venue energy`,
      `- Venue may appear as signage, facade fragment, architectural accent, or stamp — NOT a photorealistic invented building`,
      `Stylize to match era print treatment. Preserve venue identity. Do not substitute a different establishment.`,
    ].join("\n"),
  },
  {
    venueId: "live-aid",
    name: "Live Aid",
    description: "Wembley Stadium / JFK Stadium dual-venue benefit concert — global broadcast event, 1985.",
    promptInstructions: [
      `VENUE REFERENCE — LIVE AID:`,
      `Reference the historic dual-venue benefit broadcast — Wembley and Philadelphia energy.`,
      `Do not invent unrelated stadium architecture. Use broadcast-plate and global-benefit ephemera language.`,
    ].join("\n"),
  },
  {
    venueId: "woodstock",
    name: "Woodstock",
    description: "Woodstock festival grounds — only when era and event context genuinely warrant it.",
    promptInstructions: [
      `VENUE REFERENCE — WOODSTOCK:`,
      `Use only when historically appropriate. Avoid cliché crowd panoramas.`,
      `Prefer ticket ephemera, stage placard, or festival credential language over stock festival illustration.`,
    ].join("\n"),
  },
];

function normalizeVenueKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolveVenueReference(venueName: string): VenueReference | null {
  const key = normalizeVenueKey(venueName);
  if (!key) return null;

  const exact = VENUE_REFERENCES.find(
    (v) => normalizeVenueKey(v.name) === key || v.venueId === key,
  );
  if (exact) return exact;

  const partial = VENUE_REFERENCES.find(
    (v) => key.includes(v.venueId) || normalizeVenueKey(v.name).includes(key),
  );
  return partial ?? null;
}

export function venueReferencePromptBlock(venueName: string): string | null {
  const ref = resolveVenueReference(venueName);
  if (!ref) return null;

  const lines = [ref.promptInstructions];
  if (ref.description) {
    lines.unshift(`Venue character: ${ref.description}`);
  }
  if (ref.referenceImage) {
    lines.push(`Reference image available: ${ref.referenceImage} — match facade and signage faithfully, stylized to era.`);
  }
  return lines.join("\n");
}
