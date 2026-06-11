import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  hasKnownEraDna,
  rvbrEraVisualDnaForProfile,
} from "@/lib/ops/content-creator/rvbr-era-visual-dna";
import type { CreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type RvbrPromptProfile = {
  slug: string;
  preferredMotifs: string[];
  preferredComposition: string[];
  preferredTypography: string[];
  preferredColorLanguage: string[];
  discouragedMotifs: string[];
  negativePromptTerms: string[];
  compositionVariety?: string[];
};

const PROFILE_DIR = join(process.cwd(), "data/rvbr/prompt-profiles");

const FALLBACK: RvbrPromptProfile = {
  slug: "default",
  preferredMotifs: ["printed ephemera", "music-history collectible", "authentic period ornament"],
  preferredComposition: ["editorial poster framing", "collectible card structure"],
  preferredTypography: ["period-appropriate display type", "hand-lettered headline energy"],
  preferredColorLanguage: ["aged paper stock", "period ink palette", "warm print tones"],
  discouragedMotifs: ["generic stock illustration", "corporate badge layout"],
  negativePromptTerms: ["generic template", "corporate ID badge", "stock photo"],
};

const cache = new Map<string, RvbrPromptProfile>();

export function loadRvbrPromptProfile(eraSlug: string): RvbrPromptProfile {
  const cached = cache.get(eraSlug);
  if (cached) return cached;

  const path = join(PROFILE_DIR, `${eraSlug}.json`);
  if (!existsSync(path)) {
    return { ...FALLBACK, slug: eraSlug };
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as RvbrPromptProfile;
    const profile: RvbrPromptProfile = {
      slug: eraSlug,
      preferredMotifs: raw.preferredMotifs ?? [],
      preferredComposition: raw.preferredComposition ?? [],
      preferredTypography: raw.preferredTypography ?? [],
      preferredColorLanguage: raw.preferredColorLanguage ?? [],
      discouragedMotifs: raw.discouragedMotifs ?? [],
      negativePromptTerms: raw.negativePromptTerms ?? [],
      compositionVariety: raw.compositionVariety ?? [],
    };
    cache.set(eraSlug, profile);
    return profile;
  } catch {
    return { ...FALLBACK, slug: eraSlug };
  }
}

/** Single era source — palette, typography, references, anti-cliché. No duplication elsewhere. */
export function compressedEraProfileBlock(
  profile: RvbrPromptProfile,
  rvbrProfile: RvbrProfile,
  settings: CreativeDirectionSettings,
): string {
  const dna = rvbrEraVisualDnaForProfile(rvbrProfile);
  const known = hasKnownEraDna(rvbrProfile.slug);
  const lines = [
    `${rvbrProfile.name} (${rvbrProfile.eraStartYear}–${rvbrProfile.eraEndYear})`,
    `Palette: ${dna.palette.join(", ")} · Accent: ${rvbrProfile.visualIdentity.accent ?? dna.palette[0]}`,
    `Motifs: ${profile.preferredMotifs.join(", ")}`,
    `Typography: ${profile.preferredTypography.join(", ")}`,
    `Ornament: ${profile.preferredColorLanguage.join(", ")}`,
    known
      ? `Character: ${dna.mandate.slice(0, 4).join(" · ")}`
      : `Character: ${profile.preferredComposition.slice(0, 2).join(" · ") || rvbrProfile.name}`,
    `References: ${known ? dna.references.slice(0, 4).join(", ") : profile.preferredMotifs.slice(0, 3).join(", ")}`,
  ];
  const avoid = new Set([
    ...profile.discouragedMotifs,
    ...(settings.avoidEraTropes ? profile.negativePromptTerms : []),
    ...(known ? dna.forbidden.slice(0, 4) : []),
  ]);
  if (avoid.size) lines.push(`Avoid: ${[...avoid].join(", ")}`);
  return lines.join("\n");
}

