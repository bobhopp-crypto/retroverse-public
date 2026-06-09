import { renderPromptText } from "./prompt-renderer";
import { topWeightedStyles } from "./style-catalog";
import type { ConceptVariationKey, CreativeLabModuleId, CreativeLabProjectFile, GeneratedPrompt, StyleCategory } from "./types";

function newPromptId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const STYLE_CATEGORIES: StyleCategory[] = ["credential", "illustration", "color", "density"];

/** Build structured concept from project style weights — no image generation. */
export function buildPromptConcept(
  project: CreativeLabProjectFile,
  module: CreativeLabModuleId,
  variationKey?: ConceptVariationKey,
): GeneratedPrompt {
  const dominantStyles = Object.fromEntries(
    STYLE_CATEGORIES.map((cat) => [cat, topWeightedStyles(project.styleSelection, cat)]),
  ) as GeneratedPrompt["structuredConcept"]["dominantStyles"];

  const cred = dominantStyles.credential[0];
  const illust = dominantStyles.illustration[0];
  const color = dominantStyles.color[0];
  const density = dominantStyles.density[0];

  const years = project.featuredYears.length ? project.featuredYears.join(" · ") : "—";
  const conceptSummary = [
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
  });

  return {
    id: newPromptId(),
    module,
    conceptSummary,
    renderedPrompt,
    variationKey,
    structuredConcept: {
      event: project.event,
      venue: project.venue,
      date: project.date,
      featuredYears: project.featuredYears,
      theme: project.theme,
      dominantStyles,
      module,
      variationKey,
    },
    createdAt: new Date().toISOString(),
  };
}
