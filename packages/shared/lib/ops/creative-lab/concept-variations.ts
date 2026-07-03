import { buildPromptConcept } from "./prompt-builder";
import type { CreativeLabModuleId, CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt } from "./types";

export const CONCEPT_VARIATION_KEYS = ["A", "B", "C", "D"] as const;
export type ConceptVariationKey = (typeof CONCEPT_VARIATION_KEYS)[number];

function newVariationSetId(): string {
  return `varset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Build four prompt variations — same event/styles, different strategy templates. */
export function buildConceptVariations(
  project: CreativeLabProjectFile,
  module: CreativeLabModuleId,
  preset?: Pick<CreativeLabPresetFile, "id" | "name" | "defaultConceptStrategy"> | null,
): GeneratedPrompt[] {
  const variationSetId = newVariationSetId();
  const createdAt = new Date().toISOString();

  return CONCEPT_VARIATION_KEYS.map((key) => {
    const base = buildPromptConcept(project, module, key, preset);
    return {
      ...base,
      variationKey: key,
      variationSetId,
      conceptSummary: `Concept ${key} — ${base.conceptSummary}`,
      createdAt,
    };
  });
}
