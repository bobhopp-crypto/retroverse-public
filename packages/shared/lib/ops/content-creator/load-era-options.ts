import type { ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import { buildRvbrGlance } from "@/lib/ops/rvbr/presentation";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export async function loadContentCreatorEras(): Promise<ContentCreatorEraOption[]> {
  const profiles = await listRvbrProfiles();
  return profiles.map((p) => ({
    ...buildRvbrGlance(p),
    retroverseEraId: p.retroverseEraId,
    narrative: p.narrative,
    visualIdentity: {
      accent: p.visualIdentity.accent,
      subtitle: p.visualIdentity.subtitle,
      sections: p.visualIdentity.sections,
    },
    promptFragments: p.promptFragments,
  }));
}
