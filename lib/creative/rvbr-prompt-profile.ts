import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

export function eraProfilePromptBlock(profile: RvbrPromptProfile, eraLabel: string): string {
  return [
    `ERA PROFILE — ${eraLabel}:`,
    `Scope: visual language ONLY — palette, ornament, typography mood, print texture.`,
    `Does NOT dictate layout skeleton or central subject (Creative Direction controls those).`,
    ``,
    `Preferred motifs: ${profile.preferredMotifs.join(" · ")}`,
    `Preferred composition language: ${profile.preferredComposition.join(" · ")}`,
    `Preferred typography: ${profile.preferredTypography.join(" · ")}`,
    `Preferred color language: ${profile.preferredColorLanguage.join(" · ")}`,
    ``,
    `Discouraged motifs: ${profile.discouragedMotifs.join(" · ")}`,
    profile.negativePromptTerms.length
      ? `Negative terms (do not illustrate): ${profile.negativePromptTerms.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
