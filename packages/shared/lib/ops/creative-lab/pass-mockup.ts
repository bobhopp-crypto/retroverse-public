import { artifactTypeById } from "./artifact-types";
import { projectSecondaryLine } from "./project-secondary-line";
import { strategyById } from "./concept-strategies";
import { presetCardVisual } from "./preset-visuals";
import type { RefinementTreatment } from "./refinement-treatments";
import type { ConceptStrategyId, CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt } from "./types";

export type PassMockLayoutId =
  | "broadcast-badge"
  | "horizontal-credential"
  | "vertical-credential"
  | "foil-band"
  | "large-year"
  | "ticket-stub"
  | "laminate-zones"
  | "numbered-edition";

export type PassMockupSpec = {
  event: string;
  venue: string;
  date: string;
  years: string;
  passNumber: string;
  artifactLabel: string;
  strategyId: ConceptStrategyId;
  strategyLabel: string;
  tagline: string;
  palette: string[];
  variationKey: string;
  layoutId: PassMockLayoutId;
  treatmentLabel?: string;
  refinementIndex?: number;
};

const STRATEGY_TAGLINES: Record<ConceptStrategyId, string> = {
  "broadcast-focus": "Studio guest pass with ON AIR broadcast badge.",
  "credential-focus": "Backstage laminate with VIP access zones.",
  "festival-focus": "Perforated festival ticket with marquee energy.",
  "collector-focus": "Numbered keepsake edition with foil frame.",
};

const STRATEGY_LAYOUTS: Record<ConceptStrategyId, PassMockLayoutId[]> = {
  "broadcast-focus": ["broadcast-badge", "horizontal-credential", "foil-band", "vertical-credential"],
  "credential-focus": ["laminate-zones", "horizontal-credential", "vertical-credential", "foil-band"],
  "festival-focus": ["ticket-stub", "large-year", "horizontal-credential", "foil-band"],
  "collector-focus": ["numbered-edition", "foil-band", "large-year", "vertical-credential"],
};

export function layoutForStrategy(strategyId: ConceptStrategyId, variationRound: number): PassMockLayoutId {
  const layouts = STRATEGY_LAYOUTS[strategyId] ?? STRATEGY_LAYOUTS["broadcast-focus"];
  return layouts[((variationRound % layouts.length) + layouts.length) % layouts.length];
}

function passNumberFor(variationKey: string, round: number): string {
  const base = { A: 1, B: 2, C: 3, D: 4 }[variationKey] ?? 1;
  const num = base + round * 4;
  return `#${String(num).padStart(4, "0")}`;
}

export function buildPassMockupSpec(
  prompt: GeneratedPrompt,
  project: CreativeLabProjectFile,
  preset: CreativeLabPresetFile | null | undefined,
  variationRound = 0,
): PassMockupSpec {
  const strategyId = (prompt.strategyId ?? "broadcast-focus") as ConceptStrategyId;
  const strategy = strategyById(strategyId);
  const visual = preset ? presetCardVisual(preset) : null;
  const artifact = artifactTypeById(project.artifactType);
  const key = prompt.variationKey ?? "A";
  const years = projectSecondaryLine(project) || "—";

  return {
    event: project.event || "Sunday Nights",
    venue: project.venue || "The Main Pub",
    date: project.date || "June 14, 2026",
    years,
    passNumber: passNumberFor(key, variationRound),
    artifactLabel: artifact.shortLabel,
    strategyId,
    strategyLabel: strategy.label,
    tagline: STRATEGY_TAGLINES[strategyId],
    palette: visual?.palette ?? ["#f5e6c8", "#d4a574", "#2d9cb0", "#1a4a52"],
    variationKey: key,
    layoutId: layoutForStrategy(strategyId, variationRound),
  };
}

/** Round 2 — refinement mockup inheriting winner strategy + event context. */
export function buildRefinementMockupSpec(
  winningPrompt: GeneratedPrompt,
  project: CreativeLabProjectFile,
  preset: CreativeLabPresetFile | null | undefined,
  treatment: RefinementTreatment,
  refinementIndex: number,
): PassMockupSpec {
  const base = buildPassMockupSpec(winningPrompt, project, preset, 0);
  return {
    ...base,
    variationKey: String(refinementIndex),
    layoutId: treatment.layoutId,
    treatmentLabel: treatment.label,
    refinementIndex,
    passNumber: `#${String(100 + refinementIndex).padStart(4, "0")}`,
    tagline: treatment.label,
  };
}
