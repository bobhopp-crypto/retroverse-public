/** Retroverse artifact identity — one collectible credential type for all passes. */

export const ARTIFACT_ARCHETYPE_IDS = ["retroverse-collectible-credential"] as const;

export type ArtifactArchetypeId = (typeof ARTIFACT_ARCHETYPE_IDS)[number];

export type ArtifactArchetypeChoice = ArtifactArchetypeId;

export const DEFAULT_ARTIFACT_ARCHETYPE: ArtifactArchetypeChoice = "retroverse-collectible-credential";

export const RETROVERSE_COLLECTIBLE_CREDENTIAL_LABEL = "Retroverse Collectible Credential";

/** Legacy archetype ids — map to the single credential type. */
const LEGACY_ARCHETYPE_IDS = new Set([
  "random",
  "festival-ticket",
  "backstage-pass",
  "press-credential",
  "record-label-promo",
  "fan-club-card",
  "album-release-invite",
  "radio-vip-pass",
  "concert-credential",
  "tour-laminate",
  "collector-pass",
  "ticket-stub",
  "admission-ticket",
]);

export type ArtifactArchetypeDef = {
  id: ArtifactArchetypeId;
  label: string;
  primaryIdentity: string;
  secondaryIdentity: string;
  objectType: string;
  layoutStructure: string;
  avoidGenericLayout: string;
  neverGenerate: string[];
  printingMethod: string;
  paperStock: string;
  shape: string;
  embossing: string;
  seals: string;
  collectorMarks: string;
};

export const ARTIFACT_ARCHETYPES: Record<ArtifactArchetypeId, ArtifactArchetypeDef> = {
  "retroverse-collectible-credential": {
    id: "retroverse-collectible-credential",
    label: RETROVERSE_COLLECTIBLE_CREDENTIAL_LABEL,
    primaryIdentity: "Collectible commemorative credential",
    secondaryIdentity: "Event admission pass",
    objectType:
      "Retroverse collectible credential — a commemorative admission pass saved like memorabilia, not disposable entry stock.",
    layoutStructure:
      "Portrait collector card — front is full collectible artwork; back is artwork plus a dominant lower-half QR safe area, retroverse.live band, and bottom-edge serial stamp.",
    avoidGenericLayout:
      "No BIG TITLE → BIG ART → DATE poster stack. No perforated stub, tear-off tab, or gate-admission ticket layout. No small decorative QR medallion.",
    neverGenerate: [
      "concert poster",
      "ticket stub",
      "flyer",
      "handbill",
      "album cover",
      "magazine cover",
    ],
    printingMethod: "Letterpress and foil stamp on premium collector cardstock with era-appropriate ink.",
    paperStock: "Heavy linen or laid credential stock — binder-worthy, slight edge patina, keepsake not disposable.",
    shape: "Portrait collectible credential card — laminate-ready, rounded corners, no stub tear.",
    embossing: "Subtle blind-embossed border — keep authenticity seal small; QR dominates the back.",
    seals: "Small authenticity chop — subordinate to the QR safe area, not a competing medallion.",
    collectorMarks:
      "Edition crest, commemorative ribbon, binder-archive plate — something saved in a collector binder 20 years later.",
  },
};

export function artifactArchetypeById(id: string): ArtifactArchetypeDef {
  if (ARTIFACT_ARCHETYPE_IDS.includes(id as ArtifactArchetypeId)) {
    return ARTIFACT_ARCHETYPES[id as ArtifactArchetypeId];
  }
  return ARTIFACT_ARCHETYPES[DEFAULT_ARTIFACT_ARCHETYPE];
}

export function resolveArtifactArchetype(
  _choice: ArtifactArchetypeChoice | "random" | undefined,
  _seed: number,
): ArtifactArchetypeId {
  return DEFAULT_ARTIFACT_ARCHETYPE;
}

export function artifactArchetypePromptBlock(archetype: ArtifactArchetypeDef, _seed: number): string {
  return [
    `${archetype.label}`,
    `Primary: ${archetype.primaryIdentity}`,
    `Secondary: ${archetype.secondaryIdentity}`,
    `${archetype.objectType}`,
    `Structure: ${archetype.layoutStructure}`,
    `Production: ${archetype.printingMethod}; ${archetype.paperStock}; ${archetype.shape}; ${archetype.embossing}`,
    `Seals/marks: ${archetype.seals}; ${archetype.collectorMarks}`,
    `Never generate: ${archetype.neverGenerate.join(", ")}`,
    `Avoid: ${archetype.avoidGenericLayout}`,
    `Feel: binder-keepsake memorabilia — saved 20 years, not thrown away at the door.`,
  ].join("\n");
}

export function parseArtifactArchetypeChoice(raw: unknown): ArtifactArchetypeChoice {
  if (typeof raw === "string" && ARTIFACT_ARCHETYPE_IDS.includes(raw as ArtifactArchetypeId)) {
    return raw as ArtifactArchetypeId;
  }
  if (typeof raw === "string" && LEGACY_ARCHETYPE_IDS.has(raw)) {
    return DEFAULT_ARTIFACT_ARCHETYPE;
  }
  return DEFAULT_ARTIFACT_ARCHETYPE;
}
