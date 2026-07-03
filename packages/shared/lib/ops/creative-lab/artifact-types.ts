export type ArtifactTypeId = "vip-pass" | "festival-pass" | "backstage-credential" | "collector-edition";

export type ArtifactTypeDef = {
  id: ArtifactTypeId;
  label: string;
  shortLabel: string;
  description: string;
};

export const ARTIFACT_TYPES: ArtifactTypeDef[] = [
  {
    id: "vip-pass",
    label: "VIP PASS",
    shortLabel: "VIP Pass",
    description: "Premium laminate with VIP access zones and elevated finish.",
  },
  {
    id: "festival-pass",
    label: "FESTIVAL PASS",
    shortLabel: "Festival Pass",
    description: "Multi-day field credential with perforated edge and marquee type.",
  },
  {
    id: "backstage-credential",
    label: "BACKSTAGE CREDENTIAL",
    shortLabel: "Backstage Credential",
    description: "High-security backstage laminate with bold access hierarchy.",
  },
  {
    id: "collector-edition",
    label: "COLLECTOR EDITION",
    shortLabel: "Collector Edition",
    description: "Numbered keepsake with foil accents and archival presentation.",
  },
];

export const DEFAULT_ARTIFACT_TYPE: ArtifactTypeId = "vip-pass";

export function artifactTypeById(id: string | undefined | null): ArtifactTypeDef {
  return ARTIFACT_TYPES.find((a) => a.id === id) ?? ARTIFACT_TYPES[0];
}

export function normalizeArtifactTypeId(raw: unknown): ArtifactTypeId {
  if (typeof raw === "string" && ARTIFACT_TYPES.some((a) => a.id === raw)) {
    return raw as ArtifactTypeId;
  }
  return DEFAULT_ARTIFACT_TYPE;
}
