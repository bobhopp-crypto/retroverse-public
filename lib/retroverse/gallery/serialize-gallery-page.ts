import type { GalleryExperienceDefinition } from "./experience-registry";
import type { GalleryExperienceCard, GalleryPageData } from "./gallery-types";

/** Strip non-serializable registry fields before passing props to client components. */
export function toGalleryExperienceCard(
  def: GalleryExperienceDefinition,
  rvtr: string,
): GalleryExperienceCard {
  const launchHref =
    def.launchPath && (def.status === "ready" || def.status === "in_progress")
      ? def.launchPath(rvtr)
      : null;

  return {
    id: def.id,
    tier: def.tier,
    title: def.title,
    tagline: def.tagline,
    question: def.question,
    stars: def.stars,
    status: def.status,
    estimatedMinutes: def.estimatedMinutes,
    sortOrder: def.sortOrder,
    launchHref,
  };
}

export function serializeGalleryPageData(
  input: Omit<GalleryPageData, "signatureExperiences" | "supportingExperiences"> & {
    signatureExperiences: GalleryExperienceDefinition[];
    supportingExperiences: GalleryExperienceDefinition[];
  },
): GalleryPageData {
  return {
    ...input,
    signatureExperiences: input.signatureExperiences.map((def) =>
      toGalleryExperienceCard(def, input.currentRvtr),
    ),
    supportingExperiences: input.supportingExperiences.map((def) =>
      toGalleryExperienceCard(def, input.currentRvtr),
    ),
  };
}
