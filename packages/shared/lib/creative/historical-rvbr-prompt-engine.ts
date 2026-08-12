import { antiRepetitionPromptBlock } from "@/lib/creative/anti-repetition";
import {
  historicalArtifactArchetypeById,
  historicalArtifactArchetypePromptBlock,
  type HistoricalArtifactArchetypeId,
} from "@/lib/creative/historical-artifact-archetypes";
import { physicalEphemeraPromptBlock } from "@/lib/creative/physical-ephemera";
import { buildPromptMetrics, type PromptMetrics } from "@/lib/creative/prompt-metrics";
import {
  loadRvbrPromptProfile,
  type RvbrPromptProfile,
} from "@/lib/creative/rvbr-prompt-profile";
import type {
  PromptLayer,
  PromptQualityLevel,
  PromptQualityScores,
  PromptSide,
} from "@/lib/creative/rvbr-prompt-types";
import {
  avoidEraTropesPromptBlock,
  creativeDirectionById,
  maximizeVariationPromptBlock,
  pickDirectionVariation,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import type { CollectiblePassFields } from "@/lib/ops/content-creator/collectible-pass-prompt";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import { rvbrEraVisualMandateBlock } from "@/lib/ops/content-creator/rvbr-era-visual-dna";
import {
  fullBleedFrontPrompt,
  integratedBackFunctionalZonesPrompt,
  PASS_HEIGHT,
  PASS_WIDTH,
} from "@/lib/ops/creative-lab/pass-layout";
import {
  normalizePassTypeLabel,
  textGovernancePromptBlock,
  type PassTextFields,
} from "@/lib/ops/creative-lab/pass-text-governance";
import { visualWorldById } from "@/lib/ops/creative-lab/visual-worlds";
import { buildRvbrPresentation } from "@/lib/ops/rvbr/presentation";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type HistoricalPromptDebugBreakdown = {
  basePrompt: PromptLayer;
  artifactArchetype: PromptLayer;
  eraProfile: PromptLayer;
  brandRules: PromptLayer;
  directionRules: PromptLayer;
  physicalEphemera: PromptLayer;
  antiClicheRules: PromptLayer;
  antiRepetition: PromptLayer;
  layoutRules: PromptLayer;
  eventData: PromptLayer;
  rvbrMandate: PromptLayer;
};

export type HistoricalComposedRvbrPrompt = {
  finalPrompt: string;
  debugBreakdown: HistoricalPromptDebugBreakdown;
  qualityScores: PromptQualityScores;
  promptMetrics: PromptMetrics;
};

export type HistoricalRvbrPromptEngineInput = {
  side: PromptSide;
  profile: RvbrProfile;
  fields: CollectiblePassFields;
  settings: CreativeDirectionSettings;
  archetypeId: HistoricalArtifactArchetypeId;
  compositionSeed: number;
  frontSummary?: string;
};

const RETROVERSE_BRAND_RULES = [
  `RETROVERSE BRAND RULES:`,
  `- Collectible artifact first, credential second`,
  `- Feels discovered rather than manufactured — music-history object, not AI poster art`,
  `- Authentic printed ephemera: ticket, pass, sleeve, card, invite, laminate, promo stock`,
  `- Tangible keepsake from the Retroverse universe — not generic decorated template`,
  `- Physical production evidence: paper stock, printing method, perforations, embossing, seals, collector marks`,
  `- Venue names are governed text only — never buildings, facades, or architectural illustration`,
  `- Visual storytelling over form-field layout`,
  `- Avoid generic corporate design, SaaS UI, conference badge templates`,
].join("\n");

const ANTI_TEMPLATE_RULES = [
  `ANTI-TEMPLATE RULES:`,
  `- No generic laminate credential with horizontal metadata strips`,
  `- No BIG TITLE → BIG ART → DATE → YEARS stacked poster layout`,
  `- No conference-badge photo holes or lanyard corporate ID`,
  `- Each artifact archetype must produce a materially different object type`,
].join("\n");

const TEXT_INTEGRATION = [
  `TEXT INTEGRATION:`,
  `- Governed text woven into artifact structure — not form fields`,
  `- Typography follows archetype object type (ticket stub, press card, laminate plate, etc.)`,
  `- Venue is a text string in typographic bands — never a visual subject or illustrated location`,
].join("\n");

const BACK_LAYOUTS = [
  "Souvenir back — metadata in ornamental border; production QR reserve and serial plate in lower area.",
  "Handbill reverse — illustration echo; production QR reserve above collector serial footer.",
  "Ticket back — stub layout; production QR reserve above serial numbering plate.",
  "Label promo reverse — catalog strip and production QR verification reserve.",
  "Press credential back — editorial footer and production QR reserve above press corps stamp area.",
] as const;

function pickBackLayout(seed: number): string {
  return BACK_LAYOUTS[Math.abs(seed + 17) % BACK_LAYOUTS.length]!;
}

function eraProfilePromptBlock(profile: RvbrPromptProfile, eraLabel: string): string {
  return [
    `ERA PROFILE — ${eraLabel}:`,
    `Scope: visual language ONLY — palette, ornament, typography mood, print texture.`,
    `Does NOT dictate layout skeleton or central subject (Creative Direction controls those).`,
    ``,
    `Preferred motifs: ${profile.preferredMotifs.join(" · ")}`,
    `Preferred composition language: ${profile.preferredComposition.join(" · ")}`,
    `Preferred typography: ${profile.preferredTypography.join(" · ")}`,
    `Preferred color language: ${profile.preferredColorLanguage.join(" · ")}`,
    ``,
    `Discouraged motifs: ${profile.discouragedMotifs.join(" · ")}`,
    profile.negativePromptTerms.length
      ? `Negative terms (do not illustrate): ${profile.negativePromptTerms.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function rvbrVisualDnaBlock(profile: RvbrProfile): string {
  const presentation = buildRvbrPresentation(profile);
  const mood = presentation.sections
    .find((section) => section.id === "mood")
    ?.lines.slice(0, 4)
    .map((line) => line.text)
    .join(" · ");
  const typography = presentation.sections
    .find((section) => section.id === "typography")
    ?.lines.slice(0, 3)
    .map((line) => line.text)
    .join(" · ");
  const colors = presentation.sections
    .find((section) => section.id === "colors")
    ?.swatches?.slice(0, 6)
    .map((swatch) => swatch.hex)
    .join(", ");

  return [
    `RVBR VISUAL DNA — ${profile.name}:`,
    mood ? `Mood: ${mood}` : "",
    colors ? `Palette anchors: ${colors}` : "",
    typography ? `Typography: ${typography}` : "",
    presentation.lede ? `Era character: ${presentation.lede}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function creativeDirectionPromptBlock(
  settings: CreativeDirectionSettings,
  compositionSeed: number,
  creativeNotes?: string,
): string {
  const direction = creativeDirectionById(settings.creativeDirection);
  const variation = pickDirectionVariation(direction.id, compositionSeed);
  return [
    `CREATIVE DIRECTION — ${direction.label.toUpperCase()} (COMPOSITION & SUBJECT):`,
    `This direction controls layout, subject matter, and composition.`,
    `It is INDEPENDENT from era style — do not default to era clichés for subject choice.`,
    ``,
    `Composition: ${direction.composition}`,
    `Subject matter: ${direction.subjectMatter}`,
    `Typography arrangement: ${direction.typographyArrangement}`,
    `Design references: ${direction.references}`,
    ``,
    `Sub-variation (seed ${compositionSeed}): ${variation}`,
    creativeNotes?.trim()
      ? `\nDIRECTOR CONTEXT (guidance only — never render these labels or instructions as text):\n${creativeNotes.trim()}`
      : "",
    ``,
    `RULE: Era provides visual language ONLY (color, type, ornament, print texture).`,
    `Creative Direction provides structure and subject — they must not collapse into one another.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function antiClicheLayer(
  settings: CreativeDirectionSettings,
  eraProfile: RvbrPromptProfile,
): string {
  const parts: string[] = [];
  if (settings.avoidEraTropes) {
    const generic = avoidEraTropesPromptBlock(true);
    if (generic) parts.push(generic);
  }
  if (eraProfile.discouragedMotifs.length) {
    parts.push(`ERA-DISCOURAGED MOTIFS:`, ...eraProfile.discouragedMotifs.map((motif) => `- ${motif}`));
  }
  if (settings.avoidEraTropes && eraProfile.negativePromptTerms.length) {
    parts.push(`NEGATIVE PROMPT TERMS — do not illustrate:`, eraProfile.negativePromptTerms.join(", "));
  }
  return parts.length ? parts.join("\n") : `ANTI-CLICHE: disabled — era tropes not filtered.`;
}

function basePromptLayer(input: HistoricalRvbrPromptEngineInput): string {
  const sideLabel = input.side === "front" ? "FRONT" : "BACK / REVERSE";
  return [
    `RVBR PROMPT ENGINE — ${sideLabel}`,
    `Create a FINISHED ${sideLabel} of a portrait Retroverse collectible pass.`,
    `Canvas: ${PASS_WIDTH}×${PASS_HEIGHT}px, portrait, print-ready at 2.25" × 3.5".`,
    `User inputs pass through Retroverse brand orchestration — never raw to the image model.`,
    ANTI_TEMPLATE_RULES,
  ].join("\n");
}

function layoutRulesLayer(input: HistoricalRvbrPromptEngineInput): string {
  if (input.side === "front") {
    return [fullBleedFrontPrompt(), maximizeVariationPromptBlock(input.settings.maximizeVariation)]
      .filter(Boolean)
      .join("\n\n");
  }
  const frontContext = input.frontSummary ? `Front context: ${input.frontSummary}\n` : "";
  return [
    `${frontContext}Back layout variation: ${pickBackLayout(input.compositionSeed)}`,
    integratedBackFunctionalZonesPrompt(),
    maximizeVariationPromptBlock(input.settings.maximizeVariation),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function scorePromptQuality(
  input: HistoricalRvbrPromptEngineInput,
  eraProfile: RvbrPromptProfile,
): PromptQualityScores {
  const motifCount =
    eraProfile.preferredMotifs.length +
    eraProfile.preferredComposition.length +
    (eraProfile.compositionVariety?.length ?? 0);
  const eraSpecificity: PromptQualityLevel =
    motifCount >= 10 ? "high" : motifCount >= 5 ? "medium" : "low";
  const variationScore: PromptQualityLevel = input.settings.maximizeVariation ? "high" : "low";
  let clicheRisk: PromptQualityLevel = "medium";
  if (input.settings.avoidEraTropes && eraProfile.negativePromptTerms.length >= 4) clicheRisk = "low";
  else if (!input.settings.avoidEraTropes) clicheRisk = "high";
  return { eraSpecificity, brandSpecificity: "high", variationScore, clicheRisk };
}

/** Restored pre-compression eleven-layer RVBR pass prompt. */
export function composeHistoricalRvbrPrompt(
  input: HistoricalRvbrPromptEngineInput,
): HistoricalComposedRvbrPrompt {
  const eraProfile = loadRvbrPromptProfile(input.profile.slug);
  const world = visualWorldById(resolveVisualWorldFromRvbr(input.profile));
  const directionDefinition = creativeDirectionById(input.settings.creativeDirection);
  const eraLabel = `${input.profile.name} (${input.profile.eraStartYear}–${input.profile.eraEndYear})`;
  const archetype = historicalArtifactArchetypeById(input.archetypeId);
  const textFields: PassTextFields = {
    event: input.fields.event,
    venue: input.fields.venue,
    date: input.fields.date,
    secondaryLine: input.fields.secondaryLine,
    passTypeLabel: normalizePassTypeLabel(input.fields.passTypeLabel),
  };

  const base = basePromptLayer(input);
  const archetypeContent = historicalArtifactArchetypePromptBlock(archetype, input.compositionSeed);
  const eraProfileContent = [
    eraProfilePromptBlock(eraProfile, eraLabel),
    rvbrVisualDnaBlock(input.profile),
    `Visual world support: ${world.title}`,
    `Palette: ${world.palette.join(", ")}`,
    `Border: ${world.borderStyle}`,
    `Typography mood: ${world.typographyStyle}`,
  ].join("\n\n");
  const brand = RETROVERSE_BRAND_RULES;
  const direction = creativeDirectionPromptBlock(
    input.settings,
    input.compositionSeed,
    input.fields.creativeNotes,
  );
  const physicalEphemera = physicalEphemeraPromptBlock(input.compositionSeed);
  const antiCliche = antiClicheLayer(input.settings, eraProfile);
  const antiRepetition = antiRepetitionPromptBlock(
    input.profile.slug,
    eraProfile,
    input.settings.maximizeVariation,
  );
  const layout = layoutRulesLayer(input);
  const eventData = [textGovernancePromptBlock(textFields), TEXT_INTEGRATION].join("\n\n");
  const mandate = rvbrEraVisualMandateBlock(input.profile);

  const debugBreakdown: HistoricalPromptDebugBreakdown = {
    basePrompt: { id: "base", label: "Base Prompt", content: base },
    artifactArchetype: { id: "archetype", label: "Artifact Archetype", content: archetypeContent },
    eraProfile: { id: "era", label: "Era Layer", content: eraProfileContent },
    brandRules: { id: "brand", label: "Brand Layer", content: brand },
    directionRules: { id: "direction", label: "Direction Layer", content: direction },
    physicalEphemera: { id: "physical", label: "Physical Ephemera", content: physicalEphemera },
    antiClicheRules: { id: "anti-cliche", label: "Anti-Cliché Layer", content: antiCliche },
    antiRepetition: { id: "anti-repetition", label: "Anti-Repetition Layer", content: antiRepetition },
    layoutRules: { id: "layout", label: "Layout Layer", content: layout },
    eventData: { id: "event", label: "Event Data", content: eventData },
    rvbrMandate: { id: "mandate", label: "RVBR Era Mandate", content: mandate },
  };

  const finalPrompt = [
    base,
    ``,
    `═══ ARTIFACT ARCHETYPE ═══`,
    archetypeContent,
    ``,
    `═══ ERA STYLE ═══`,
    eraProfileContent,
    ``,
    `═══ RETROVERSE BRAND ═══`,
    brand,
    ``,
    `═══ CREATIVE DIRECTION ═══`,
    direction,
    ``,
    `═══ PHYSICAL EPHEMERA ═══`,
    physicalEphemera,
    ``,
    `═══ ANTI-CLICHÉ ═══`,
    antiCliche,
    ``,
    `═══ ANTI-REPETITION ═══`,
    antiRepetition,
    ``,
    `═══ LAYOUT ═══`,
    layout,
    ``,
    `═══ EVENT DATA ═══`,
    eventData,
    ``,
    `═══ RVBR ERA MANDATE (PRIMARY) ═══`,
    mandate,
    ``,
    `FINAL: ${input.side === "front" ? "100% artwork front" : "production QR + serial reserve on back"} · Archetype: ${archetype.label} · Direction: ${directionDefinition.label} · Seed: ${input.compositionSeed}`,
  ].join("\n");

  return {
    finalPrompt,
    debugBreakdown,
    qualityScores: scorePromptQuality(input, eraProfile),
    promptMetrics: buildPromptMetrics(finalPrompt),
  };
}
