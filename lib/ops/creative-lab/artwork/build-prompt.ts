import { artifactTypeById } from "../artifact-types";
import { artDirectionByKey } from "../art-directions";
import type { CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt, RefinementVariation } from "../types";
import type { ArtworkPromptContext } from "./types";

export function buildArtworkPromptText(
  project: CreativeLabProjectFile,
  winningPrompt: GeneratedPrompt,
  preset: CreativeLabPresetFile | null,
  refinement?: RefinementVariation,
): string {
  const direction = artDirectionByKey(winningPrompt.variationKey);
  const artifact = artifactTypeById(project.artifactType);
  const base = winningPrompt.renderedPrompt.trim();

  const treatmentBlock = refinement
    ? [
        "",
        "=== Selected Art Direction ===",
        `Visual world: ${direction.title}`,
        `Refinement: ${refinement.treatmentLabel}`,
        `Treatment focus: ${refinement.treatmentId.replace(/-/g, " ")}`,
      ].join("\n")
    : "";

  const artworkBrief = [
    "",
    "=== Artwork Brief ===",
    "Create a collectible illustrated event credential — 95% artwork, 5% event text.",
    "Portrait orientation VIP pass suitable for lamination.",
    "Rich illustrated poster quality — not a form layout or business card.",
    `Artifact: ${artifact.label}`,
    `Event line (small, integrated): ${project.event} · ${project.venue} · ${project.date}`,
    `Years: ${project.featuredYears.join(" · ") || "—"}`,
    preset ? `Preset: ${preset.name}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${base}${treatmentBlock}${artworkBrief}`;
}

export function buildArtworkContext(
  project: CreativeLabProjectFile,
  winningPrompt: GeneratedPrompt,
  preset: CreativeLabPresetFile | null,
  refinement?: RefinementVariation,
): ArtworkPromptContext {
  const direction = artDirectionByKey(winningPrompt.variationKey);
  return {
    prompt: buildArtworkPromptText(project, winningPrompt, preset, refinement),
    artifactTypeId: project.artifactType ?? "vip-pass",
    presetName: preset?.name,
    presetId: preset?.id,
    event: project.event,
    venue: project.venue,
    date: project.date,
    featuredYears: project.featuredYears,
    module: project.activeModule,
    artDirectionTitle: direction.title,
    treatmentLabel: refinement?.treatmentLabel,
    variationIndex: refinement?.index,
  };
}
