import { artifactTypeById } from "./artifact-types";
import { strategyById, strategyForVariation } from "./concept-strategies";
import { influencesForConcept } from "./influences";
import { renderPromptText } from "./prompt-renderer";
import { topWeightedStyles } from "./style-catalog";
import type {
  ConceptVariationKey,
  CreativeLabModuleId,
  CreativeLabPresetFile,
  CreativeLabProjectFile,
  GeneratedPrompt,
  StyleCategory,
} from "./types";

function newPromptId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const STYLE_CATEGORIES: StyleCategory[] = ["credential", "illustration", "color", "density"];

/** Build structured concept from project style weights — no image generation. */
export function buildPromptConcept(
  project: CreativeLabProjectFile,
  module: CreativeLabModuleId,
  variationKey?: ConceptVariationKey,
  preset?: Pick<CreativeLabPresetFile, "id" | "name" | "defaultConceptStrategy"> | null,
): GeneratedPrompt {
  const strategyId = strategyForVariation(project.conceptStrategies, variationKey);
  const strategyLabel = strategyById(strategyId).label;

  const dominantStyles = Object.fromEntries(
    STYLE_CATEGORIES.map((cat) => [cat, topWeightedStyles(project.styleSelection, cat)]),
  ) as GeneratedPrompt["structuredConcept"]["dominantStyles"];

  const cred = dominantStyles.credential[0];
  const illust = dominantStyles.illustration[0];
  const color = dominantStyles.color[0];
  const density = dominantStyles.density[0];

  const artifact = artifactTypeById(project.artifactType);
  const influenceTags = influencesForConcept(project.activePresetId, strategyId).map((i) => i.label);
  const years = project.featuredYears.length ? project.featuredYears.join(" · ") : "—";
  const conceptSummary = [
    variationKey ? `Concept ${variationKey}` : null,
    strategyLabel,
    artifact.shortLabel,
    project.event,
    project.venue,
    project.date,
    years,
    cred ? `${cred.label} (${cred.weight}%)` : null,
    illust ? `${illust.label} (${illust.weight}%)` : null,
    color ? `${color.label} (${color.weight}%)` : null,
    density ? `${density.label} (${density.weight}%)` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  const renderedPrompt = renderPromptText({
    event: project.event,
    venue: project.venue,
    date: project.date,
    featuredYears: project.featuredYears,
    theme: project.theme,
    styleSelection: project.styleSelection,
    module,
    variationKey,
    conceptStrategies: project.conceptStrategies,
    preset: preset ?? null,
    artifactType: project.artifactType,
  });

  return {
    id: newPromptId(),
    module,
    conceptSummary,
    renderedPrompt,
    variationKey,
    strategyId,
    structuredConcept: {
      event: project.event,
      venue: project.venue,
      date: project.date,
      featuredYears: project.featuredYears,
      theme: project.theme,
      artifactType: project.artifactType,
      influenceTags,
      dominantStyles,
      module,
      variationKey,
      strategyId,
    },
    createdAt: new Date().toISOString(),
  };
}
