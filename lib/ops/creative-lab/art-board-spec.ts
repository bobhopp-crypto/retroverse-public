import { artDirectionById, artDirectionByKey, type ArtDirectionId } from "./art-directions";
import type { ArtRefinementTreatment } from "./art-direction-refinements";
import type { ConceptVariationKey, CreativeLabProjectFile } from "./types";

export type ArtBoardSpec = {
  artDirectionId: ArtDirectionId;
  event: string;
  venue: string;
  date: string;
  years: string;
  passNumber: string;
  treatment?: ArtRefinementTreatment;
  refinementIndex?: number;
};

export function buildArtBoardSpec(
  project: CreativeLabProjectFile,
  variationKey: ConceptVariationKey | string | undefined,
  refinement?: ArtRefinementTreatment,
  refinementIndex?: number,
): ArtBoardSpec {
  const direction = artDirectionByKey(variationKey);
  const years = project.featuredYears.length ? project.featuredYears.join(" · ") : "";
  const idx = refinementIndex ?? 0;
  return {
    artDirectionId: direction.id,
    event: project.event || "Sunday Nights",
    venue: project.venue || "",
    date: project.date || "",
    years,
    passNumber: `#${String(100 + idx).padStart(3, "0")}`,
    treatment: refinement,
    refinementIndex: refinementIndex,
  };
}

export function buildRefinementArtBoardSpec(
  project: CreativeLabProjectFile,
  artDirectionId: ArtDirectionId,
  treatment: ArtRefinementTreatment,
  refinementIndex: number,
): ArtBoardSpec {
  const years = project.featuredYears.length ? project.featuredYears.join(" · ") : "";
  return {
    artDirectionId,
    event: project.event || "Sunday Nights",
    venue: project.venue || "",
    date: project.date || "",
    years,
    passNumber: `#${String(100 + refinementIndex).padStart(3, "0")}`,
    treatment,
    refinementIndex,
  };
}

export function artDirectionIdFromKey(key: ConceptVariationKey | string | undefined): ArtDirectionId {
  return artDirectionByKey(key).id;
}
