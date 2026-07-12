import { loadRvbrPromptProfile } from "@/lib/creative/rvbr-prompt-profile";
import { visualWorldById, type VisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import { buildRvbrGlance } from "@/lib/ops/rvbr/presentation";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

import { resolveRvbrProfileForYear } from "./canon-profiles";

/** RVBR drives exhibit content — not Retroverse UI chrome. */
export type SongEraExhibit = {
  eraSlug: string;
  eraName: string;
  eraYears: string;
  retroverseEraId: string;
  songYear: number | null;
  visualWorldId: VisualWorldId;
  /** Cultural mood — exhibit placard copy, not UI color. */
  moodLine: string | null;
  /** Period atmosphere — visual world description. */
  atmosphereDescription: string;
  /** Primary artifact label (Fillmore posters, MTV backstage passes, etc.). */
  artifactReference: string | null;
  /** Suggested exhibit forms for story/discovery chapters (future illustration hooks). */
  exhibitForms: string[];
  typographyHint: string;
};

export function buildSongEraExhibit(input: {
  profile: RvbrProfile;
  songYear: number | null;
}): SongEraExhibit {
  const { profile, songYear } = input;
  const visualWorldId = resolveVisualWorldFromRvbr(profile);
  const world = visualWorldById(visualWorldId);
  const promptProfile = loadRvbrPromptProfile(profile.slug);
  const glance = buildRvbrGlance(profile);

  const exhibitForms = uniqueStrings([
    ...world.visualReferences.slice(0, 3),
    ...promptProfile.preferredMotifs.slice(0, 2),
  ]);

  return {
    eraSlug: profile.slug,
    eraName: profile.name,
    eraYears: `${profile.eraStartYear}–${profile.eraEndYear}`,
    retroverseEraId: profile.retroverseEraId,
    songYear,
    visualWorldId,
    moodLine: glance.moodLine,
    atmosphereDescription: world.description,
    artifactReference: world.visualReferences[0] ?? promptProfile.preferredMotifs[0] ?? null,
    exhibitForms,
    typographyHint:
      promptProfile.preferredTypography[0] ?? world.typographyStyle.split(",")[0]?.trim() ?? "",
  };
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** What era does this song belong to? Content for exhibits, not UI skinning. */
export function resolveSongEraExhibit(
  songYear: number | null | undefined,
): SongEraExhibit | null {
  try {
    const profile = resolveRvbrProfileForYear(songYear);
    if (!profile) return null;
    return buildSongEraExhibit({ profile, songYear: songYear ?? null });
  } catch (error) {
    // Era presentation is optional enrichment. A missing or malformed bundled
    // canon/profile file must never take down the canonical Song page.
    console.warn("[song-era-exhibit] optional era enrichment unavailable", {
      songYear: songYear ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
