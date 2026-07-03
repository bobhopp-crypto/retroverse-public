import type { CSSProperties } from "react";

import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import { buildArtDirectionProfile } from "@/lib/retroverse/art-direction/build-art-direction-profile";
import type { LabLayoutId } from "@/lib/retroverse/experience-lab/types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";

export { buildArtDirectionProfile } from "@/lib/retroverse/art-direction/build-art-direction-profile";

/** CSS custom properties for Experience Lab panes — derived from Art Direction Profile. */
export function dnaThemeVars(
  dna: CollectorSongDna | null,
  layoutId: LabLayoutId,
  rvtr: string,
  experience?: ParsedExperience | null,
): CSSProperties {
  const profile = buildArtDirectionProfile({
    songDna: dna,
    experience,
    layoutId,
    rvtr,
  });
  return profile.themeVars as CSSProperties;
}
