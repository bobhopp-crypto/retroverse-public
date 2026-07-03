import { artifactTypeById } from "./artifact-types";
import { projectSecondaryLine } from "./project-secondary-line";
import { strategyById } from "./concept-strategies";
import { influencesForConcept } from "./influences";
import { presetCardVisual } from "./preset-visuals";
import { styleById } from "./style-catalog";
import type { CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt } from "./types";

export type ConceptMockBoard = {
  title: string;
  strategyLabel: string;
  visualSummary: string;
  artifactSummary: string;
  strategySummary: string;
  palette: string[];
  artifactLabel: string;
  styleSummary: string;
  influenceTags: string[];
};

export function buildConceptMockBoard(
  prompt: GeneratedPrompt,
  project: CreativeLabProjectFile,
  preset?: CreativeLabPresetFile | null,
): ConceptMockBoard {
  const key = prompt.variationKey ?? "?";
  const strategy = prompt.strategyId ? strategyById(prompt.strategyId) : null;
  const visual = preset ? presetCardVisual(preset) : null;
  const artifact = artifactTypeById(project.artifactType);

  const cred = prompt.structuredConcept.dominantStyles.credential[0];
  const illust = prompt.structuredConcept.dominantStyles.illustration[0];
  const color = prompt.structuredConcept.dominantStyles.color[0];

  const credLabel = cred?.label ?? styleById(cred?.id ?? "")?.label ?? "Credential";
  const illustLabel = illust?.label ?? styleById(illust?.id ?? "")?.label ?? "Illustration";
  const colorLabel = color?.label ?? styleById(color?.id ?? "")?.label ?? "Color";

  const influences = influencesForConcept(project.activePresetId, prompt.strategyId);
  const years = projectSecondaryLine(project) || "—";

  return {
    title: `Concept ${key}`,
    strategyLabel: strategy?.label ?? `Concept ${key}`,
    visualSummary: `${illustLabel} illustration on ${colorLabel} stock — ${visual?.intendedUse ?? project.event}`,
    artifactSummary: `${artifact.shortLabel} for ${project.event} at ${project.venue} (${project.date})`,
    strategySummary: strategy?.description ?? prompt.conceptSummary,
    palette: visual?.palette ?? ["#f5e6c8", "#d4a574", "#2d9cb0", "#e85d2a"],
    artifactLabel: artifact.shortLabel,
    styleSummary: `${credLabel} · ${illustLabel} · ${colorLabel} · Years ${years}`,
    influenceTags: influences.map((i) => i.label),
  };
}
