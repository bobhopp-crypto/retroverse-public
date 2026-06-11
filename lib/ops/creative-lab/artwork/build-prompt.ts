import { refinementsForArtDirection } from "../art-direction-refinements";
import { projectSecondaryLine } from "../project-secondary-line";
import { compositionForKey } from "../concept-compositions";
import { renderPassConceptPrompt } from "../pass-concept-prompt";
import type { CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt, RefinementVariation } from "../types";
import { visualWorldById, type VisualWorldId } from "../visual-worlds";
import type { ArtworkPromptContext } from "./types";

export function buildArtworkPromptText(
  project: CreativeLabProjectFile,
  winningPrompt: GeneratedPrompt,
  _preset: CreativeLabPresetFile | null,
  refinement?: RefinementVariation,
): string {
  const worldId = (project.selectedArtDirectionId ?? "psychedelic-festival") as VisualWorldId;
  const conceptKey = winningPrompt.variationKey ?? "A";
  const treatment = refinement
    ? refinementsForArtDirection(worldId).find((t) => t.id === refinement.treatmentId)
    : undefined;

  return renderPassConceptPrompt({
    worldId,
    event: project.event,
    venue: project.venue,
    date: project.date,
    secondaryLine: projectSecondaryLine(project),
    conceptKey,
    refinement: treatment,
    refinementIndex: refinement?.index,
    parentConceptSummary: winningPrompt.conceptSummary,
  });
}

export function buildArtworkContext(
  project: CreativeLabProjectFile,
  winningPrompt: GeneratedPrompt,
  preset: CreativeLabPresetFile | null,
  refinement?: RefinementVariation,
): ArtworkPromptContext {
  const worldId = (project.selectedArtDirectionId ?? "psychedelic-festival") as VisualWorldId;
  const world = visualWorldById(worldId);
  const comp = compositionForKey(winningPrompt.variationKey ?? "A", worldId);
  return {
    prompt: buildArtworkPromptText(project, winningPrompt, preset, refinement),
    artifactTypeId: project.artifactType ?? "vip-pass",
    presetName: preset?.name,
    presetId: preset?.id,
    event: project.event,
    venue: project.venue,
    date: project.date,
    secondaryLine: projectSecondaryLine(project),
    module: project.activeModule,
    artDirectionTitle: world.title,
    treatmentLabel: refinement?.treatmentLabel ?? comp.label,
    variationIndex: refinement?.index,
  };
}
