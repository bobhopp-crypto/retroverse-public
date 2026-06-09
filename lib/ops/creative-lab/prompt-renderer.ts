import { styleById, topWeightedStyles } from "./style-catalog";
import type { CreativeLabModuleId, CreativeLabPresetFile, CreativeLabProjectFile, StyleCategory } from "./types";

export type PromptRenderInput = {
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  theme: string;
  styleSelection: CreativeLabProjectFile["styleSelection"];
  module: CreativeLabModuleId;
  preset?: Pick<CreativeLabPresetFile, "id" | "name"> | null;
  variationKey?: "A" | "B" | "C" | "D";
};

const STYLE_CATEGORIES: StyleCategory[] = ["credential", "illustration", "color", "density"];

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

function yearsLine(years: number[]): string {
  if (!years.length) return "Featured years not specified.";
  return years.join(", ");
}

function variationLead(key: PromptRenderInput["variationKey"]): string {
  switch (key) {
    case "A":
      return "Emphasis: event hero — lead with venue, date, and featured-year narrative as the emotional anchor.";
    case "B":
      return "Emphasis: credential format — lead with pass/laminate structure, access zones, and print-ready hierarchy.";
    case "C":
      return "Emphasis: illustration direction — lead with art style, line quality, and period-authentic graphic language.";
    case "D":
      return "Emphasis: collectibility — lead with tactile print finish, foil/stub details, and shelf-worthy memorabilia feel.";
    default:
      return "Emphasis: balanced — event, format, illustration, and collectibility weighted evenly.";
  }
}

/** Provider-neutral, human-readable prompt text. */
export function renderPromptText(input: PromptRenderInput): string {
  const years = yearsLine(input.featuredYears);
  const theme = input.theme.trim() || "No theme specified.";
  const presetLine = input.preset
    ? `Style preset: ${input.preset.name} (${input.preset.id}).`
    : "Style preset: custom project selection.";

  const sections = [
    "=== Event Context ===",
    `Event: ${input.event || "—"}`,
    `Venue: ${input.venue || "—"}`,
    `Date: ${input.date || "—"}`,
    `Featured years: ${years}`,
    `Theme: ${theme}`,
    `Module: ${MODULE_LABELS[input.module]}`,
    presetLine,
    variationLead(input.variationKey),
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
    "Output should be print-ready at collectible scale with crisp type, visible hierarchy, and period-appropriate registration.",
    "",
    "=== Collectibility Requirements ===",
    "Design must feel like a found artifact from the featured era — tactile paper stock, intentional wear optional, strong silhouette at thumbnail size, and metadata legible at arm's length.",
    "Avoid generic stock-template layouts. Favor bold Retroverse editorial framing with thick outlines and warm retro palettes where color styles allow.",
  ];

  return sections.join("\n");
}

export function renderLivePreview(
  project: CreativeLabProjectFile,
  preset?: CreativeLabPresetFile | null,
): string {
  return renderPromptText({
    event: project.event,
    venue: project.venue,
    date: project.date,
    featuredYears: project.featuredYears,
    theme: project.theme,
    styleSelection: project.styleSelection,
    module: project.activeModule,
    preset: preset ? { id: preset.id, name: preset.name } : null,
  });
}
