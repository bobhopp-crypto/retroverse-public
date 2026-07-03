import {
  renderStrategySections,
  strategyById,
  strategyForVariation,
  type ConceptStrategyMap,
} from "./concept-strategies";
import { styleById, topWeightedStyles } from "./style-catalog";
import { artifactTypeById, type ArtifactTypeId } from "./artifact-types";
import { projectSecondaryLine } from "./project-secondary-line";
import type { CreativeLabModuleId, CreativeLabPresetFile, CreativeLabProjectFile, StyleCategory } from "./types";

export type PromptRenderInput = {
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
  theme: string;
  styleSelection: CreativeLabProjectFile["styleSelection"];
  module: CreativeLabModuleId;
  preset?: Pick<CreativeLabPresetFile, "id" | "name" | "defaultConceptStrategy"> | null;
  variationKey?: "A" | "B" | "C" | "D";
  conceptStrategies?: ConceptStrategyMap;
  artifactType?: ArtifactTypeId;
};

const MODULE_LABELS: Record<CreativeLabModuleId, string> = {
  "pass-lab": "event credential / laminate",
  "poster-lab": "show poster",
  "bumper-lab": "broadcast bumper",
  "card-lab": "collector trading card",
  "magazine-lab": "magazine cover",
};

function formatWeightedList(
  category: StyleCategory,
  selection: CreativeLabProjectFile["styleSelection"],
): string {
  const rows = topWeightedStyles(selection, category, 6);
  if (!rows.length) return "None selected — assign style weights before generating.";
  return rows
    .map((row) => {
      const def = styleById(row.id);
      const desc = def?.description ?? "";
      return `• ${row.label} (${row.weight}%): ${desc}`;
    })
    .join("\n");
}

function secondaryLineLabel(line: string): string {
  if (!line.trim()) return "Secondary line not specified.";
  return line.trim();
}

/** Provider-neutral, human-readable prompt text. */
export function renderPromptText(input: PromptRenderInput): string {
  const secondary = secondaryLineLabel(input.secondaryLine);
  const theme = input.theme.trim() || "No theme specified.";
  const presetLine = input.preset
    ? `Style preset: ${input.preset.name} (${input.preset.id}). Default strategy: ${strategyById(input.preset.defaultConceptStrategy).label}.`
    : "Style preset: custom project selection.";

  const strategyId = strategyForVariation(input.conceptStrategies, input.variationKey);
  const strategyBlocks = renderStrategySections(strategyId, {
    event: input.event,
    venue: input.venue,
    date: input.date,
    secondaryLine: input.secondaryLine,
    theme: input.theme,
    module: input.module,
    styleSelection: input.styleSelection,
    variationKey: input.variationKey,
  });

  const sections = [
    "=== Event Context ===",
    `Event: ${input.event || "—"}`,
    `Venue: ${input.venue || "—"}`,
    `Date: ${input.date || "—"}`,
    `Secondary line: ${secondary}`,
    `Theme: ${theme}`,
    `Module: ${MODULE_LABELS[input.module]}`,
    `Artifact type: ${artifactTypeById(input.artifactType).label}`,
    presetLine,
    input.variationKey ? `Concept variation: ${input.variationKey}` : "",
    "",
    ...strategyBlocks,
    "",
    "=== Visual Style (Credential) ===",
    formatWeightedList("credential", input.styleSelection),
    "",
    "=== Illustration Style ===",
    formatWeightedList("illustration", input.styleSelection),
    "",
    "=== Color Style ===",
    formatWeightedList("color", input.styleSelection),
    "",
    "=== Print Requirements ===",
    formatWeightedList("density", input.styleSelection),
  ];

  return sections.filter((line, idx, arr) => !(line === "" && arr[idx - 1] === "")).join("\n");
}

export function renderLivePreview(
  project: CreativeLabProjectFile,
  preset?: CreativeLabPresetFile | null,
): string {
  return renderPromptText({
    event: project.event,
    venue: project.venue,
    date: project.date,
    secondaryLine: projectSecondaryLine(project),
    theme: project.theme,
    styleSelection: project.styleSelection,
    module: project.activeModule,
    preset: preset ? { id: preset.id, name: preset.name, defaultConceptStrategy: preset.defaultConceptStrategy } : null,
    conceptStrategies: project.conceptStrategies,
    artifactType: project.artifactType,
  });
}
